# PlumeNote

Application de notes collaboratives pour équipes IT. Éditeur Markdown temps réel avec synchronisation via Yjs/Hocuspocus.

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Tech Stack

- **Next.js 16** - App Router, React Server Components
- **React 19** - Concurrent features
- **TypeScript 5** - Strict mode enabled
- **Tailwind CSS 4** - CSS-first configuration
- **Prisma 7** - PostgreSQL ORM (à venir)
- **Tiptap + Yjs** - Éditeur collaboratif (à venir)

## Project Structure

```
src/
├── app/                    # Next.js App Router (pages, layouts, routes)
│
├── features/               # Feature modules (co-location pattern)
│   ├── auth/              # Authentification et gestion utilisateurs
│   ├── notes/             # CRUD et gestion des notes
│   ├── editor/            # Éditeur Tiptap et extensions
│   ├── search/            # Recherche full-text et filtrage
│   ├── workspaces/        # Espaces de travail et permissions
│   ├── navigation/        # Sidebar, dossiers, arborescence
│   ├── templates/         # Templates de notes
│   └── analytics/         # Métriques et statistiques
│
├── components/ui/          # shadcn/ui components
│
├── lib/                    # Utilitaires globaux
│   ├── utils.ts           # cn() pour Tailwind class merging
│   ├── constants.ts       # Constantes globales
│   └── api-error.ts       # Erreurs RFC 7807
│
├── stores/                 # Zustand stores globaux
│
└── types/                  # Types TypeScript globaux
```

### Feature Module Structure

Chaque feature suit le pattern de co-location :

```
features/[feature]/
├── components/            # Composants React spécifiques
├── hooks/                 # Custom hooks
├── api/                   # Route handlers et services
└── index.ts               # Barrel exports
```

## Naming Conventions

| Élément | Convention | Exemple |
|---------|------------|---------|
| Dossiers features | kebab-case | `auth/`, `notes/` |
| Composants | PascalCase | `NoteCard.tsx` |
| Hooks | camelCase avec use | `useNotes.ts` |
| Utilitaires | kebab-case | `api-error.ts` |
| Index exports | index.ts | Barrel exports |

## Import Aliases

```typescript
import { cn } from "@/lib/utils";
import { useNotes } from "@/features/notes";
import { Button } from "@/components/ui/button";
```

L'alias `@/*` pointe vers `./src/*`.

## Scripts

```bash
npm run dev      # Serveur de développement (Turbopack)
npm run build    # Build de production
npm run start    # Serveur de production
npm run lint     # ESLint
```

## License

Private - Tous droits réservés
