import { Component, signal, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideMail, LucideLock, LucideLogIn } from '@lucide/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, LucideMail, LucideLock, LucideLogIn],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal<string | null>(null);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    motDePasse: ['', [Validators.required]],
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const { email, motDePasse } = this.form.getRawValue();
      await this.authService.login(email!, motDePasse!);
      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.errorMessage.set(
        err?.error?.message ?? 'Email ou mot de passe incorrect',
      );
    } finally {
      this.loading.set(false);
    }
  }
}