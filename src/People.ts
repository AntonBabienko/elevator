import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import Lift from './Lift';
import House from './House';

export default class People extends Container {
    public floor: number;
    // Поточний поверх, на якому знаходиться людина.
    public targetFloor: number;
    // Цільовий поверх, на який людина хоче потрапити.
    public isInLift: boolean = false;
    // Показує, чи людина знаходиться в ліфті.
    private isMoving: boolean = false;
    // Показує, чи людина зараз рухається.
    public get moving(): boolean {
        return this.isMoving;
    }
    constructor(floor: number) {

        super();
        this.floor = floor;

        do {
            this.targetFloor = Math.floor(Math.random() * 8) + 1;
        } while (this.targetFloor === floor);

        const myColor = this.floor > this.targetFloor ? 0x00ce0f : 0x0000ff;

        const person = new Graphics();
        person.setStrokeStyle({
            width: 3,
            color: myColor,
            alpha: 1,
        });
        person.drawRect(0, 0, 20, 50);

        const style = new TextStyle({
            fontFamily: 'Arial',
            fontSize: 16,
            fill: '#000000ff',
        });

        const text = new Text(this.targetFloor.toString(), style);
        text.anchor.set(0.5);
        text.position.set(10, 20);
        person.stroke();
        this.addChild(person);
        this.addChild(text);
    }

    public async moveToLift(): Promise<void> {
        // Анімує рух людини до ліфта (з правої сторони будівлі до лівої).
        if (this.isMoving) return;
        this.isMoving = true;

        // Анімація руху до ліфта (з правої сторони до лівої)
        const targetX = 100;
        const duration = 2000; // 2 секунди на перехід

        return new Promise((resolve) => {
            const startX = this.position.x;
            const startTime = performance.now();

            const animate = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                this.position.x = startX + (targetX - startX) * progress;

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.isMoving = false;
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    public async moveFromLift(): Promise<void> {
        // Анімує рух людини від ліфта до правої сторони будівлі після виходу з ліфта.
        if (this.isMoving) return;
        this.isMoving = true;

        // Анімація руху від ліфта до правої сторони
        const targetX = 800;
        const duration = 2000; // 2 секунди на перехід

        return new Promise((resolve) => {
            const startX = this.position.x;
            const startTime = performance.now();

            const animate = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                this.position.x = startX + (targetX - startX) * progress;

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.isMoving = false;
                    this.visible = false; // Ховаємо людину
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    public enterLift(lift: Lift): void {
        // Додає людину до ліфта, встановлюючи її позицію та стан.
        this.isInLift = true;
    }


    public exitLift(): void {
        this.isInLift = false;
        this.floor = this.targetFloor;
        this.position.y = 480 - (-50 + (this.floor * 60));
        this.visible = true;
        this.moveFromLift().then(() => {
            if (this.parent) {
                const house = this.parent as House;
                house.removePerson(this);

            }
        });
    }


    public getDirection(): 'up' | 'down' {
        // Повертає напрямок руху людини в залежності від цільового поверху.
        return this.targetFloor > this.floor ? 'up' : 'down';
    }
}