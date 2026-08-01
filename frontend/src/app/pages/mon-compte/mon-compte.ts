import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Header } from '../../shared/header/header';
import { AuthService } from '../../services/auth.service';

interface ProfileData {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  actif: boolean;
  departementId: number | null;
  departement: { id: number; nom: string } | null;
}

interface PasswordForm {
  ancienMotDePasse: string;
  nouveauMotDePasse: string;
  confirmationMotDePasse: string;
}

@Component({
  selector: 'app-mon-compte',
  standalone: true,
  imports: [Header, CommonModule],
  templateUrl: './mon-compte.html',
  styleUrl: './mon-compte.css',
})
export class MonCompte implements OnInit {
  private authService = inject(AuthService);

  profile = signal<ProfileData | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  readonly roleLabels: Partial<Record<string, string>> = {
    EMPLOYE: 'Employé',
    AGENT: 'Agent',
    MANAGER: 'Manager',
    ADMIN: 'Administrateur',
  };

  passwordForm = signal<PasswordForm>({
    ancienMotDePasse: '',
    nouveauMotDePasse: '',
    confirmationMotDePasse: '',
  });
  passwordSubmitting = signal(false);
  passwordError = signal<string | null>(null);
  passwordSuccess = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await this.authService.getMe();
      this.profile.set(data);
    } catch {
      this.error.set('Erreur lors du chargement du profil.');
    } finally {
      this.loading.set(false);
    }
  }

  updatePasswordField(field: keyof PasswordForm, value: string): void {
    this.passwordForm.update((f) => ({ ...f, [field]: value }));
    this.passwordError.set(null);
    this.passwordSuccess.set(null);
  }

  get initials(): string {
    const p = this.profile();
    if (!p) return '?';
    return `${p.prenom.charAt(0)}${p.nom.charAt(0)}`;
  }

  async submitPasswordChange(): Promise<void> {
    const form = this.passwordForm();

    if (!form.ancienMotDePasse || !form.nouveauMotDePasse || !form.confirmationMotDePasse) {
      this.passwordError.set('Tous les champs sont obligatoires.');
      return;
    }
    if (form.nouveauMotDePasse.length < 6) {
      this.passwordError.set('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (form.nouveauMotDePasse !== form.confirmationMotDePasse) {
      this.passwordError.set('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }

    this.passwordSubmitting.set(true);
    this.passwordError.set(null);
    this.passwordSuccess.set(null);

    try {
      await this.authService.changePassword(form.ancienMotDePasse, form.nouveauMotDePasse);
      this.passwordSuccess.set('Mot de passe mis à jour avec succès.');
      this.passwordForm.set({
        ancienMotDePasse: '',
        nouveauMotDePasse: '',
        confirmationMotDePasse: '',
      });
    } catch (err: any) {
      this.passwordError.set(
        err?.error?.message ?? 'Erreur lors de la mise à jour du mot de passe.',
      );
    } finally {
      this.passwordSubmitting.set(false);
    }
  }
}