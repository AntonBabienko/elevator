import { Container, Graphics } from 'pixi.js';
import People from './People'; // Додано імпорт

export default class Lift extends Container {
    public currentFloor: number;
    private readonly floorHeight: number = 60;
    private readonly baseY: number = 460;
    private liftGraphics: Graphics;
    private capacity: number = 3;
    public passengers: People[] = []; // Змінено на public
    private isMoving: boolean = false;
    public direction: 'up' | 'down' | 'idle' = 'idle'; // Змінено на public
    public lastFullDirection: 'up' | 'down' | null = null;
    seats: boolean[] = [false, false, false];
    constructor() {
        super();
        this.currentFloor = 1;

        const g = new Graphics();
        g.lineStyle(3, 0x00ccff, 1); // блакитний колір

        // Малюємо контур ліфта з "діркою" справа
        g.moveTo(0, 0);          // верх-ліво
        g.lineTo(80, 0);         // верх-права
        g.lineTo(80, 10);        // вниз трохи по правій стороні
        g.moveTo(80, 60);        // пропускаємо середину правого боку
        g.lineTo(80, 60);        // нижній край правого боку
        g.lineTo(0, 60);         // низ-ліво
        g.lineTo(0, 0);          // замикання

        this.liftGraphics = g;
        this.addChild(this.liftGraphics);

        this.position.set(20, this.baseY);
        this.liftGraphics.stroke();
    }

    public async goToFloor(floor: number): Promise<void> {

        if (this.isMoving) return Promise.reject('Lift is already moving');

        if (floor < 1 || floor > 8) return Promise.reject('Invalid floor');

        if (floor === this.currentFloor) return Promise.resolve();

        this.isMoving = true;

        this.direction = floor > this.currentFloor ? 'up' : 'down';

        const targetY = this.baseY - (floor - 1) * this.floorHeight;

        const floorsToMove = Math.abs(floor - this.currentFloor);

        const duration = floorsToMove * 800; // 1 секунда на поверх

        return new Promise((resolve) => {

            const startY = this.position.y;

            const startTime = performance.now();


            const animate = (currentTime: number) => {

                const elapsed = currentTime - startTime;

                const progress = Math.min(elapsed / duration, 1);

                this.position.y = startY + (targetY - startY) * progress;

                // Перевіряємо, чи треба зупинитися на проміжному поверсі
                const currentProgressFloor = Math.round(
                    this.currentFloor + (floor - this.currentFloor) * progress
                );

                if (currentProgressFloor !== this.currentFloor) {
                    // this.direction = currentProgressFloor > this.currentFloor ? 'up' : 'down';
                    // this.lastFullDirection = this.direction; // Зберігаємо останній напрямок
                    this.currentFloor = currentProgressFloor;

                }

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.currentFloor = floor;
                    this.isMoving = false;
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    public async loadPassengers(people: People[]): Promise<void> {
        // Завантажує пасажирів до ліфта, якщо є вільне місце та людина йде в тому ж напрямку.
        if (this.isMoving) return Promise.reject('Cannot load while moving');

        // Фільтруємо людей, які йдуть в тому ж напрямку, що і ліфт, або якщо ліфт на крайньому поверсі
        const suitablePeople = people.filter(person => {

            if (person.moving === false) {
                if (this.direction === 'idle') {
                    //
                    // На крайніх поверхах дозволяємо завантажуватись незалежно від напрямку
                    return (this.currentFloor === 1 && person.getDirection() === 'up') ||
                        (this.currentFloor === 8 && person.getDirection() === 'down');
                    //
                }
                return (this.direction === 'up' && person.targetFloor > this.currentFloor) ||
                    (this.direction === 'down' && person.targetFloor < this.currentFloor);

            }
        });

        // Беремо стільки людей, скільки вміщається
        const peopleToLoad = suitablePeople.slice(0, this.capacity - this.passengers.length);

        for (const person of peopleToLoad) {
            const freeSeatIndex = this.seats.findIndex(seat => !seat);
            if (freeSeatIndex !== -1) {
                this.seats[freeSeatIndex] = true;
                this.passengers.push(person);
                person.enterLift(this);


                if (person.parent) {
                    person.parent.removeChild(person);
                }
                this.addChild(person);
                // Встановлюємо позицію людини відповідно до місця в ліфті
                person.position.set(
                    freeSeatIndex * 25, // X-координата (25px між місцями)
                    10 // Y-координата (фіксована)
                );
            }
        }

        return new Promise(resolve => setTimeout(resolve, 800));

    }

    public async unloadPassengers(): Promise<void> {

        if (this.isMoving) return Promise.reject('Cannot unload while moving');

        // Видаляємо людей, які прибули на свій поверх
        const arrivingPassengers = this.passengers.filter(
            person => person.targetFloor === this.currentFloor
        );

        if (arrivingPassengers.length === 0) return Promise.resolve();

        this.passengers = this.passengers.filter(
            person => person.targetFloor !== this.currentFloor
        );

        // Виводимо пасажирів по одному з паузою
        for (const passenger of arrivingPassengers) {


            this.seats[passenger.position.x / 25] = false; // Звільняємо місце
            passenger.exitLift();
            this.removeChild(passenger);
            this.emit('passengerUnloaded', passenger); // Подія для інших компонентів

            await new Promise(resolve => setTimeout(resolve, 100)); // Пауза 100 мс між пасажирами
        }
    }

    public getDirection(): 'up' | 'down' | 'idle' {
        return this.direction;
    }

    public hasSpace(): boolean {
        return this.passengers.length < this.capacity;
    }
}