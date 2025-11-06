import { Component, signal} from '@angular/core';
import { AuthService } from './services/auth.service';
import { SocketService } from './services/socket';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {

  constructor(
    private authService: AuthService,
    private socketService: SocketService
  ) {}

  protected readonly title = signal('helpdesk-app');
  ngOnInit(): void {
    if (this.authService.estaLogado()) {
      this.socketService.conectar();
    }
  }
}
