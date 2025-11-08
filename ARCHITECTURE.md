# W3C Design Tokens Importer - Architecture

## Vue d'ensemble

Plugin Figma refactoré avec architecture modulaire et séparation frontend/backend.

## Structure des dossiers

```
src/
├── backend/              # Backend Figma plugin
│   ├── main.ts          # Point d'entrée avec dependency injection
│   ├── controllers/     # Business logic orchestration
│   │   ├── TokenController.ts
│   │   ├── GitHubController.ts
│   │   └── ScopeController.ts
│   ├── services/
│   │   └── StorageService.ts
│   └── utils/
│       └── ErrorHandler.ts
│
├── frontend/            # Frontend UI
│   ├── index.ts        # Point d'entrée UI
│   ├── components/     # UI Components
│   │   ├── BaseComponent.ts
│   │   ├── WelcomeScreen.ts
│   │   ├── ImportScreen.ts
│   │   ├── TokenScreen.ts
│   │   └── ScopeScreen.ts
│   ├── services/
│   │   └── PluginBridge.ts
│   ├── state/
│   │   └── AppState.ts
│   └── styles/
│       └── main.css
│
├── shared/             # Code partagé
│   ├── types.ts       # Définitions TypeScript
│   └── constants.ts   # Constantes
│
└── services/          # Services existants (réutilisés)
    ├── variableManager.ts
    ├── githubService.ts
    └── styleManager.ts
```

## Principes architecturaux

### Backend

- **Dependency Injection**: Services injectés dans controllers
- **Controller Pattern**: Orchestration de la logique métier
- **Result Pattern**: Gestion d'erreurs type-safe
- **Single Responsibility**: Une responsabilité par classe

### Frontend

- **Observable Pattern**: AppState émet des événements
- **Component Pattern**: BaseComponent pour tous les composants
- **Centralized State**: AppState comme source unique de vérité
- **Promise-based Communication**: PluginBridge pour backend

## Build System

```bash
npm run build           # Build backend + frontend
npm run build:backend   # src/backend/main.ts → code.js
npm run build:frontend  # src/frontend/index.ts → ui.js
```

## Flux de données

1. **User Interaction** → Component
2. Component → **AppState** (update state)
3. Component → **PluginBridge** (send to backend)
4. Backend → **Controller** (business logic)
5. Controller → **Service** (operations)
6. Backend → **PluginBridge** (response)
7. PluginBridge → Component → **UI Update**

## Fichiers générés

- `code.js` (68KB) - Backend bundlé
- `ui.js` (42KB) - Frontend bundlé
- `ui.html` (17KB) - Shell HTML minimal

## Migration depuis l'ancien code

- ✅ Toutes les fonctionnalités préservées
- ✅ Compatibilité storage maintenue
- ✅ Code 80% réduit grâce à la modularité
- ✅ Maintenabilité grandement améliorée
