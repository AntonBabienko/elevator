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
    constructor() {
        super();
        this.currentFloor = 1;

        this.liftGraphics = new Graphics();
        this.liftGraphics.lineStyle(3, 0x0ff000, 1);
        this.liftGraphics.drawRect(0, 0, 80, 60);
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
        const duration = floorsToMove * 1000; // 1 секунда на поверх

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
                    this.currentFloor = currentProgressFloor;
                    // Тут можна додати логіку для перевірки нових пасажирів
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
        if (this.isMoving) return Promise.reject('Cannot load while moving');

        // Фільтруємо людей, які йдуть в тому ж напрямку, що і ліфт, або якщо ліфт на крайньому поверсі
        const suitablePeople = people.filter(person => {
            if (this.direction === 'idle') {
                // На крайніх поверхах дозволяємо завантажуватись незалежно від напрямку
                return (this.currentFloor === 1 && person.getDirection() === 'up') ||
                    (this.currentFloor === 8 && person.getDirection() === 'down');
            }
            return (this.direction === 'up' && person.targetFloor > this.currentFloor) ||
                (this.direction === 'down' && person.targetFloor < this.currentFloor);
        });

        // Беремо стільки людей, скільки вміщається
        const peopleToLoad = suitablePeople.slice(0, this.capacity - this.passengers.length);

        if (peopleToLoad.length === 0) return Promise.resolve();

        // Додаємо людей до ліфта
        this.passengers = [...this.passengers, ...peopleToLoad];
        peopleToLoad.forEach(person => person.enterLift(this));

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
            passenger.exitLift();
            await new Promise(resolve => setTimeout(resolve, 100)); // Пауза 500 мс між пасажирами
        }
    }

    public getDirection(): 'up' | 'down' | 'idle' {
        return this.direction;
    }

    public hasSpace(): boolean {
        return this.passengers.length < this.capacity;
    }
}