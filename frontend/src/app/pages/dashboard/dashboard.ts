import { Component, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Header } from '../../shared/header/header';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [Header],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  authService = inject(AuthService);
}