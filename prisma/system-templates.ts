/**
 * System Templates Definitions
 *
 * This file contains the content and definitions for system templates.
 * Separated from seed.ts to allow testing without database side effects.
 *
 * Story 7.4: Template Fiche Serveur (FR35)
 * Story 7.5: Template Procedure (FR36)
 */

// ============================================
// System Templates Content
// ============================================

export const FICHE_SERVEUR_CONTENT = `# Fiche Serveur

## Informations Generales

| Propriete | Valeur |
|-----------|--------|
| **Nom** | [Nom du serveur] |
| **IP/FQDN** | [Adresse IP ou nom de domaine] |
| **Systeme d'exploitation** | [Ex: Ubuntu 24.04 LTS, Windows Server 2022] |
| **Role/Fonction** | [Ex: Serveur web, Base de donnees, Backup] |
| **Environnement** | [Production / Staging / Developpement] |
| **Localisation** | [Datacenter, Rack, Position] |

## Specifications Techniques

| Composant | Specification |
|-----------|---------------|
| **CPU** | [Ex: 4 vCPU Intel Xeon] |
| **RAM** | [Ex: 16 Go] |
| **Stockage** | [Ex: SSD 500 Go + HDD 2 To] |
| **Reseau** | [Ex: 1 Gbps, VLAN 100] |

## Services Installes

| Service | Version | Port | Statut |
|---------|---------|------|--------|
| [Nom du service] | [Version] | [Port] | [Actif/Inactif] |
| [Nom du service] | [Version] | [Port] | [Actif/Inactif] |

## Acces & Securite

### Acces SSH
- **Port SSH**: [22 ou autre]
- **Utilisateurs autorises**: [Liste des utilisateurs]
- **Cle SSH**: [Emplacement de la cle publique]

### Pare-feu
| Port | Protocole | Source | Description |
|------|-----------|--------|-------------|
| [Port] | [TCP/UDP] | [IP/CIDR] | [Description] |

### Certificats SSL
- **Domaine**: [domaine.example.com]
- **Expiration**: [Date d'expiration]
- **Emetteur**: [Let's Encrypt, DigiCert, etc.]

## Sauvegardes

| Type | Frequence | Retention | Destination |
|------|-----------|-----------|-------------|
| [Incrementale/Complete] | [Quotidien/Hebdo] | [30 jours] | [Emplacement] |

## Contacts

| Role | Nom | Email | Telephone |
|------|-----|-------|-----------|
| **Responsable technique** | [Nom] | [email@example.com] | [+33...] |
| **Support niveau 1** | [Equipe] | [support@example.com] | [+33...] |
| **Fournisseur hebergement** | [Nom] | [contact@provider.com] | [+33...] |

## Historique des Interventions

| Date | Intervention | Intervenant | Resultat |
|------|--------------|-------------|----------|
| [YYYY-MM-DD] | [Description de l'intervention] | [Nom] | [OK/Echec] |
| [YYYY-MM-DD] | [Description de l'intervention] | [Nom] | [OK/Echec] |

---

*Derniere mise a jour: [Date]*
*Cree depuis le template Fiche Serveur PlumeNote*`;

export const PROCEDURE_CONTENT = `# Procedure: [Nom de la procedure]

## Objectif

[Decrivez l'objectif de cette procedure en 1-2 phrases claires]

**Resultat attendu**: [Ce qui sera accompli a la fin de la procedure]

## Prerequis

Avant de commencer, assurez-vous d'avoir:

- [ ] [Prerequis 1: ex. Acces administrateur au serveur]
- [ ] [Prerequis 2: ex. Backup des donnees effectue]
- [ ] [Prerequis 3: ex. Documentation technique a portee de main]

**Temps estime**: [ex. 30 minutes]
**Niveau de difficulte**: [Debutant / Intermediaire / Expert]

## Etapes

### Etape 1: [Titre de l'etape]

- [ ] 1.1 [Sous-etape detaillee]
- [ ] 1.2 [Sous-etape detaillee]
- [ ] 1.3 [Sous-etape detaillee]

> **Note**: [Conseil ou avertissement important pour cette etape]

### Etape 2: [Titre de l'etape]

- [ ] 2.1 [Sous-etape detaillee]
- [ ] 2.2 [Sous-etape detaillee]

> **Attention**: [Point critique a ne pas manquer]

### Etape 3: [Titre de l'etape]

- [ ] 3.1 [Sous-etape detaillee]
- [ ] 3.2 [Sous-etape detaillee]

## Verification

Apres execution, verifiez que:

- [ ] [Critere de succes 1: ex. Le service repond sur le port 443]
- [ ] [Critere de succes 2: ex. Les logs ne montrent pas d'erreur]
- [ ] [Critere de succes 3: ex. L'utilisateur peut se connecter]

**Commande de verification** (si applicable):
\`\`\`bash
[Commande a executer pour verifier le succes]
\`\`\`

## Depannage

| Probleme | Cause probable | Solution |
|----------|----------------|----------|
| [Description du probleme] | [Cause] | [Action corrective] |
| [Description du probleme] | [Cause] | [Action corrective] |
| [Description du probleme] | [Cause] | [Action corrective] |

### Erreurs courantes

1. **[Nom de l'erreur]**
   - Symptome: [Ce qui se passe]
   - Solution: [Comment resoudre]

2. **[Nom de l'erreur]**
   - Symptome: [Ce qui se passe]
   - Solution: [Comment resoudre]

## Contacts

| Role | Nom | Email | Telephone |
|------|-----|-------|-----------|
| **Responsable procedure** | [Nom] | [email@example.com] | [+33...] |
| **Support technique** | [Equipe] | [support@example.com] | [+33...] |
| **Escalade niveau 2** | [Nom] | [email@example.com] | [+33...] |

## Historique des modifications

| Date | Version | Modification | Auteur |
|------|---------|--------------|--------|
| [YYYY-MM-DD] | 1.0 | Creation initiale | [Nom] |

---

*Derniere mise a jour: [Date]*
*Cree depuis le template Procedure PlumeNote*`;

// ============================================
// System Templates Definition
// ============================================

export interface SystemTemplate {
  name: string;
  description: string;
  icon: string;
  isSystem: true;
  content: string;
}

export const SYSTEM_TEMPLATES: SystemTemplate[] = [
  {
    name: 'Fiche Serveur',
    description:
      'Documentez les caracteristiques et la configuration de vos serveurs de maniere standardisee',
    icon: 'server',
    isSystem: true,
    content: FICHE_SERVEUR_CONTENT,
  },
  {
    name: 'Procedure',
    description:
      'Documentez vos procedures operationnelles avec des etapes claires et des checkboxes de suivi',
    icon: 'list-checks',
    isSystem: true,
    content: PROCEDURE_CONTENT,
  },
];
