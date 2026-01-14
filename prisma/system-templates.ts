/**
 * System Templates Definitions
 *
 * This file contains the content and definitions for system templates.
 * Separated from seed.ts to allow testing without database side effects.
 *
 * Story 7.4: Template Fiche Serveur (FR35)
 * Story 7.5: Template Procedure (FR36) - will be added later
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
  // Story 7.5 will add the "Procedure" template here
];
