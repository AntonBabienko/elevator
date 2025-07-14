import { Container, Graphics, Text } from 'pixi.js';
import Lift from './Lift';
import People from './People';

export default class House extends Container {
    public lift: Lift;
    // Посилання на об'єкт ліфта, який переміщується між поверхами та взаємодіє з людьми.
    private people: People[] = [];
    // Масив людей, які знаходяться у будинку (очікують або перебувають у ліфті).
    private floorCount: number = 8;
    // Кількість поверхів у будинку. Використовується для генерації людей та визначення їхніх цільових поверхів.

    constructor() {
        super();
        this.createBuilding();
        this.lift = new Lift();
        this.lift.position.set(20, 460);
        this.addChild(this.lift);

        this.startSpawningPeople();
        this.startLiftOperation();
    }

    private createBuilding(): void {
        // Створює графічне представлення будинку: контур будівлі, лінії поверхів та підписи рівнів.
        const view = new Graphics();
        view.setStrokeStyle({ width: 3, color: 0x00ff00, alpha: 1 });
        view.drawRect(20, 40, 880, 480);

        const lineLength: number = 800;
        const lineSpacing: number = 60;
        const startY: number = 100;

        for (let i = 0; i < 7; i++) {
            view.moveTo(100, startY + i * lineSpacing);
            view.lineTo(lineLength + 100, startY + i * lineSpacing);
        }

        for (let i = 0; i < 8; i++) {
            const myText = new Text('level ' + (i + 1));
            myText.x = 800;
            myText.y = 480 - i * lineSpacing;
            this.addChild(myText);
        }

        view.stroke();
        this.addChild(view);
    }

    private startSpawningPeople(): void {

        for (let i = 0; i < 3; i++) {
            const floor = Math.floor(Math.random() * this.floorCount) + 1;
            this.spawnPerson(floor);
        }

    }

    private spawnPerson(floor: number): void {
        // Створює нового об'єкта People на вказаному поверсі та додає його до сцени.
        const person = new People(floor);
        person.position.set(
            800, // Починаємо з правої сторони
            480 - (-50 + (floor * 60)) // Y-координата поверху
        );
        this.addChild(person);
        this.people.push(person);

        // Людина починає рух до ліфта
        person.moveToLift().then(() => {
            // Коли людина дійшла до ліфта, вона готова до завантаження
        });
    }
    // House.ts
    private async startLiftOperation(): Promise<void> {
        while (true) {
            await this.determineLiftDirection();

            if ((this.lift.currentFloor === 1 && this.lift.direction === 'up') ||
                (this.lift.currentFloor === 8 && this.lift.direction === 'down')) {
                const waitingPeople = this.getPeopleWaitingOnFloor(this.lift.currentFloor);
                if (waitingPeople.length > 0 && this.lift.hasSpace()) {
                    await this.lift.loadPassengers(waitingPeople);
                }
            }

            if (this.lift.direction === 'idle') {
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }

            // Отримуємо список всіх поверхів у поточному напрямку до кінцевої точки
            const stopFloors = this.getStopFloorsInDirection();

            if (stopFloors.length === 0) {
                this.lift.direction = 'idle';
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }

            // Рухаємо ліфт по всіх поверхах до кінцевої точки
            for (const floor of stopFloors) {
                await this.lift.goToFloor(floor);

                // Висаджуємо пасажирів
                await this.lift.unloadPassengers();

                // Завантажуємо нових пасажирів
                const waitingPeople = this.getPeopleWaitingOnFloor(floor);
                if (waitingPeople.length > 0 && this.lift.hasSpace()) {
                    await this.lift.loadPassengers(waitingPeople);
                }
            }

            // Якщо ліфт порожній, змінюємо напрямок
            if (this.lift.passengers.length === 0) {
                this.lift.direction = this.lift.direction === 'up' ? 'down' : 'up';
                this.lift.lastFullDirection = this.lift.direction;
            }
        }
    }

    private async determineLiftDirection(): Promise<void> {
        // Якщо ліфт не порожній, продовжуємо рух у поточному напрямку
        if (this.lift.passengers.length > 0) {
            return;
        }

        // Отримуємо списки очікуючих пасажирів
        const upPeople = this.people.filter(p =>
            !p.isInLift &&
            p.getDirection() === 'up'
        );

        const downPeople = this.people.filter(p =>
            !p.isInLift &&
            p.getDirection() === 'down'
        );

        // Особливі випадки для крайніх поверхів
        if (this.lift.currentFloor === 1) {
            const peopleOnFirstFloor = this.people.filter(p =>
                !p.isInLift &&
                p.floor === 1 &&
                p.getDirection() === 'up'
            );

            if (peopleOnFirstFloor.length > 0) {
                this.lift.direction = 'up';
                return;
            }
        }

        if (this.lift.currentFloor === 8) {
            const peopleOnEighthFloor = this.people.filter(p =>
                !p.isInLift &&
                p.floor === 8 &&
                p.getDirection() === 'down'
            );

            if (peopleOnEighthFloor.length > 0) {
                this.lift.direction = 'down';
                return;
            }
        }

        // Визначаємо, чи є пасажири в обох напрямках
        const hasUp = upPeople.length > 0;
        const hasDown = downPeople.length > 0;

        // Якщо є пасажири тільки в одному напрямку
        if (hasUp && !hasDown) {
            this.lift.direction = 'up';
            return;
        }
        if (hasDown && !hasUp) {
            this.lift.direction = 'down';
            return;
        }

        // Якщо є пасажири в обох напрямках
        if (hasUp && hasDown) {
            // Визначаємо, чи є пасажири вище поточного поверху, які потребують руху вниз
            const peopleAboveNeedingDown = this.people.filter(p =>
                !p.isInLift &&
                p.floor > this.lift.currentFloor &&
                p.getDirection() === 'down'
            );

            // Визначаємо, чи є пасажири нижче поточного поверху, які потребують руху вгору
            const peopleBelowNeedingUp = this.people.filter(p =>
                !p.isInLift &&
                p.floor < this.lift.currentFloor &&
                p.getDirection() === 'up'
            );

            // Якщо є пасажири вище, які потребують руху вниз, спершу обслуговуємо їх
            if (peopleAboveNeedingDown.length > 0 && this.lift.lastFullDirection !== 'up') {
                this.lift.direction = 'up';
                this.lift.lastFullDirection = 'up';
                return;
            }

            // Якщо є пасажири нижче, які потребують руху вгору, спершу обслуговуємо їх
            if (peopleBelowNeedingUp.length > 0 && this.lift.lastFullDirection !== 'down') {
                this.lift.direction = 'down';
                this.lift.lastFullDirection = 'down';
                return;
            }

            // Якщо немає таких пасажирів, чергуємо напрямки між ітераціями
            if (this.lift.lastFullDirection === 'down' || !this.lift.lastFullDirection) {
                this.lift.direction = 'up';
                this.lift.lastFullDirection = 'up';
            } else {
                this.lift.direction = 'down';
                this.lift.lastFullDirection = 'down';
            }
            return;
        }

        // Якщо немає очікуючих пасажирів
        this.lift.direction = 'idle';
    }

    private getStopFloorsInDirection(): number[] {
        const direction = this.lift.direction;
        const currentFloor = this.lift.currentFloor;
        const liftPassengers = this.lift.passengers;
        const waitingPeople = this.people.filter(p => !p.isInLift);

        if (direction === 'idle') {
            return [];
        }

        if (direction === 'up') {
            // Знаходимо максимальний поверх серед пасажирів у ліфті
            const maxPassengerFloor = liftPassengers.reduce((max, p) =>
                Math.max(max, p.targetFloor), currentFloor);

            // Знаходимо максимальний поверх серед очікуючих пасажирів, які йдуть вгору
            const maxWaitingUpFloor = waitingPeople
                .filter(p => p.getDirection() === 'up' && p.floor >= currentFloor)
                .reduce((max, p) => Math.max(max, p.floor), currentFloor);

            // Знаходимо максимальний поверх серед очікуючих пасажирів, які йдуть вниз (якщо вони вище поточного поверху)
            const maxWaitingDownFloor = waitingPeople
                .filter(p => p.getDirection() === 'down' && p.floor > currentFloor)
                .reduce((max, p) => Math.max(max, p.floor), currentFloor);

            const farthestFloor = Math.max(maxPassengerFloor, maxWaitingUpFloor, maxWaitingDownFloor);

            // Повертаємо всі поверхі від поточного до farthestFloor
            return Array.from(
                { length: farthestFloor - currentFloor },
                (_, i) => currentFloor + i + 1
            );
        } else { // direction === 'down'
            // Знаходимо мінімальний поверх серед пасажирів у ліфті
            const minPassengerFloor = liftPassengers.reduce((min, p) =>
                Math.min(min, p.targetFloor), currentFloor);

            // Знаходимо мінімальний поверх серед очікуючих пасажирів, які йдуть вниз
            const minWaitingDownFloor = waitingPeople
                .filter(p => p.getDirection() === 'down' && p.floor <= currentFloor)
                .reduce((min, p) => Math.min(min, p.floor), currentFloor);

            // Знаходимо мінімальний поверх серед очікуючих пасажирів, які йдуть вгору (якщо вони нижче поточного поверху)
            const minWaitingUpFloor = waitingPeople
                .filter(p => p.getDirection() === 'up' && p.floor < currentFloor)
                .reduce((min, p) => Math.min(min, p.floor), currentFloor);

            const farthestFloor = Math.min(minPassengerFloor, minWaitingDownFloor, minWaitingUpFloor);

            // Повертаємо всі поверхі від поточного до farthestFloor (у зворотньому порядку)
            return Array.from(
                { length: currentFloor - farthestFloor },
                (_, i) => currentFloor - i - 1
            );
        }
    }

    private getPeopleWaitingOnFloor(floor: number): People[] {
        return this.people.filter(p => {
            if (!p.isInLift && p.floor === floor) {
                // Особлива логіка для крайніх поверхів
                if (floor === 1) return p.getDirection() === 'up';
                if (floor === 8) return p.getDirection() === 'down';

                // Стандартна логіка для інших поверхів
                return (this.lift.direction === 'up' && p.getDirection() === 'up') ||
                    (this.lift.direction === 'down' && p.getDirection() === 'down');
            }
            return false;
        });
    }
}