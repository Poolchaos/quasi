import { inject } from 'aurelia-framework';
import { Router } from 'aurelia-router';
import { PLATFORM } from 'aurelia-pal';

@inject(Router)
export class App {
  message = 'Hello World!';

  configureRouter(config, router) {
    this.router = router;
    config.title = 'Aurelia';
    config.map([
      { route: ['', 'home'],      name: 'home',         moduleId: PLATFORM.moduleName('views/home/home') },
      { route: 'room/',           name: 'room-select',  moduleId: PLATFORM.moduleName('views/room/room'),   title: 'Select Room' },
      { route: 'room/:id',        name: 'room',         moduleId: PLATFORM.moduleName('views/room/room'),   title: 'Room' }
    ]);
  }

  constructor(router) {
    this.router = router;
  }

  home() {
    this.router.navigate('');
  }

  room() {
    this.router.navigate('room');
  }
}
