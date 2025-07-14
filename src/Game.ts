
import { Application } from 'pixi.js';
import House from './House';

export default class Game {
    #app: Application;
    private house: House;

    constructor(app: Application) {
        this.#app = app;
        this.house = new House();
        this.house.x = 100;
        this.house.y = 100;
        this.#app.stage.addChild(this.house);

    }
}