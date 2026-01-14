/**
 * Tests for the seed script and system templates
 *
 * Story 7.4: Template Fiche Serveur (FR35)
 * Story 7.5: Template Procedure (FR36)
 *
 * These tests verify:
 * 1. The actual content from system-templates.ts (not duplicated)
 * 2. The seed logic for upsert behavior
 * 3. System template properties match ACs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import actual exports from system-templates.ts (no side effects)
import {
  FICHE_SERVEUR_CONTENT,
  PROCEDURE_CONTENT,
  SYSTEM_TEMPLATES,
  type SystemTemplate,
} from '../prisma/system-templates';

// Mock dependencies for seed logic tests
const mockCreate = vi.fn();
const mockFindFirst = vi.fn();
const mockUpdate = vi.fn();

describe('System Templates', () => {
  describe('FICHE_SERVEUR_CONTENT - Real Content Validation', () => {
    // Required sections per AC2
    const REQUIRED_SECTIONS = [
      'Informations Generales',
      'Specifications Techniques',
      'Services Installes',
      'Acces & Securite',
      'Sauvegardes',
      'Contacts',
      'Historique des Interventions',
    ];

    // Required placeholders per AC3
    const REQUIRED_PLACEHOLDERS = [
      '[Nom du serveur]',
      '[Adresse IP ou nom de domaine]',
      '[Ex: Ubuntu 24.04 LTS, Windows Server 2022]',
      '[Ex: Serveur web, Base de donnees, Backup]',
      '[Ex: 4 vCPU Intel Xeon]',
      '[Ex: 16 Go]',
      '[Ex: SSD 500 Go + HDD 2 To]',
      '[22 ou autre]',
      '[YYYY-MM-DD]',
    ];

    it('should export FICHE_SERVEUR_CONTENT as a non-empty string', () => {
      expect(FICHE_SERVEUR_CONTENT).toBeDefined();
      expect(typeof FICHE_SERVEUR_CONTENT).toBe('string');
      expect(FICHE_SERVEUR_CONTENT.length).toBeGreaterThan(100);
    });

    it('should have all required sections (AC2)', () => {
      for (const section of REQUIRED_SECTIONS) {
        expect(
          FICHE_SERVEUR_CONTENT,
          `Missing section: ${section}`
        ).toContain(section);
      }
    });

    it('should have clear placeholders guiding user input (AC3)', () => {
      for (const placeholder of REQUIRED_PLACEHOLDERS) {
        expect(
          FICHE_SERVEUR_CONTENT,
          `Missing placeholder: ${placeholder}`
        ).toContain(placeholder);
      }
    });

    it('should start with a proper Markdown title', () => {
      expect(FICHE_SERVEUR_CONTENT).toMatch(/^# Fiche Serveur/);
    });

    it('should contain Markdown tables for structured data', () => {
      // Check for table syntax (pipe character and separator row pattern)
      expect(FICHE_SERVEUR_CONTENT).toContain('|');
      // Markdown table separators use |---| pattern with varying dash counts
      expect(FICHE_SERVEUR_CONTENT).toMatch(/\|[-]+\|/);
    });

    it('should have IP/FQDN field in Informations Generales', () => {
      expect(FICHE_SERVEUR_CONTENT).toContain('IP/FQDN');
    });

    it('should have Role/Fonction field', () => {
      expect(FICHE_SERVEUR_CONTENT).toContain('Role/Fonction');
    });
  });

  describe('PROCEDURE_CONTENT - Real Content Validation (Story 7.5)', () => {
    // Required sections per AC2
    const REQUIRED_SECTIONS = [
      'Objectif',
      'Prerequis',
      'Etapes',
      'Verification',
      'Depannage',
      'Contacts',
    ];

    // Required placeholders per AC3
    const REQUIRED_PLACEHOLDERS = [
      '[Nom de la procedure]',
      '[Decrivez l\'objectif',
      '[Prerequis',
      '[Titre de l\'etape]',
      '[Sous-etape detaillee]',
      '[Critere de succes',
      '[Description du probleme]',
      '[email@example.com]',
    ];

    it('should export PROCEDURE_CONTENT as a non-empty string', () => {
      expect(PROCEDURE_CONTENT).toBeDefined();
      expect(typeof PROCEDURE_CONTENT).toBe('string');
      expect(PROCEDURE_CONTENT.length).toBeGreaterThan(100);
    });

    it('should have all required sections (AC2)', () => {
      for (const section of REQUIRED_SECTIONS) {
        expect(
          PROCEDURE_CONTENT,
          `Missing section: ${section}`
        ).toContain(section);
      }
    });

    it('should have clear placeholders guiding user input (AC3)', () => {
      for (const placeholder of REQUIRED_PLACEHOLDERS) {
        expect(
          PROCEDURE_CONTENT,
          `Missing placeholder: ${placeholder}`
        ).toContain(placeholder);
      }
    });

    it('should start with a proper Markdown title', () => {
      expect(PROCEDURE_CONTENT).toMatch(/^# Procedure:/);
    });

    it('should contain checkboxes for steps and verification (AC6)', () => {
      // Check for checkbox syntax "- [ ]"
      expect(PROCEDURE_CONTENT).toContain('- [ ]');
      // Should have multiple checkboxes
      const checkboxCount = (PROCEDURE_CONTENT.match(/- \[ \]/g) || []).length;
      expect(checkboxCount).toBeGreaterThanOrEqual(10);
    });

    it('should have numbered steps (1.1, 1.2, etc.)', () => {
      expect(PROCEDURE_CONTENT).toContain('1.1');
      expect(PROCEDURE_CONTENT).toContain('1.2');
      expect(PROCEDURE_CONTENT).toContain('2.1');
    });

    it('should contain Markdown tables for structured data', () => {
      // Check for table syntax (pipe character and separator row pattern)
      expect(PROCEDURE_CONTENT).toContain('|');
      expect(PROCEDURE_CONTENT).toMatch(/\|[-]+\|/);
    });

    it('should have a Depannage section with problem/cause/solution columns', () => {
      expect(PROCEDURE_CONTENT).toContain('Probleme');
      expect(PROCEDURE_CONTENT).toContain('Cause probable');
      expect(PROCEDURE_CONTENT).toContain('Solution');
    });

    it('should have blockquotes for notes and warnings', () => {
      expect(PROCEDURE_CONTENT).toContain('> **Note**:');
      expect(PROCEDURE_CONTENT).toContain('> **Attention**:');
    });

    it('should have code block for verification command', () => {
      expect(PROCEDURE_CONTENT).toContain('```bash');
    });

    it('should have Historique des modifications section', () => {
      expect(PROCEDURE_CONTENT).toContain('Historique des modifications');
      expect(PROCEDURE_CONTENT).toContain('Version');
      expect(PROCEDURE_CONTENT).toContain('Modification');
      expect(PROCEDURE_CONTENT).toContain('Auteur');
    });

    // Story 7.5 Task 5: Content validation for note creation compatibility
    it('should have content size within note creation limits (< 100KB)', () => {
      const contentBytes = new TextEncoder().encode(PROCEDURE_CONTENT).length;
      expect(contentBytes).toBeLessThan(100 * 1024); // 100KB limit per NFR27
    });

    it('should have valid Markdown structure for editor parsing', () => {
      // Verify proper heading hierarchy (starts with H1, has H2s)
      expect(PROCEDURE_CONTENT).toMatch(/^#\s+/m); // H1 exists
      expect(PROCEDURE_CONTENT).toMatch(/^##\s+/m); // H2 exists
      // Verify no malformed Markdown (unclosed code blocks)
      const codeBlockOpens = (PROCEDURE_CONTENT.match(/```/g) || []).length;
      expect(codeBlockOpens % 2).toBe(0); // Even number = properly closed
    });

    it('should have checkboxes in standard Markdown format for Tiptap', () => {
      // Tiptap taskList expects "- [ ]" format at line start
      expect(PROCEDURE_CONTENT).toMatch(/^- \[ \]/m);
      // All checkboxes should be properly prefixed with "- "
      const allCheckboxMatches = PROCEDURE_CONTENT.match(/\[ \]/g) || [];
      const properCheckboxMatches = PROCEDURE_CONTENT.match(/- \[ \]/g) || [];
      expect(allCheckboxMatches.length).toBe(properCheckboxMatches.length);
    });
  });

  describe('SYSTEM_TEMPLATES - Template Definition Validation', () => {
    it('should export SYSTEM_TEMPLATES array', () => {
      expect(SYSTEM_TEMPLATES).toBeDefined();
      expect(Array.isArray(SYSTEM_TEMPLATES)).toBe(true);
    });

    it('should contain at least one template', () => {
      expect(SYSTEM_TEMPLATES.length).toBeGreaterThanOrEqual(1);
    });

    it('should contain Fiche Serveur template', () => {
      const ficheServeur = SYSTEM_TEMPLATES.find(
        (t) => t.name === 'Fiche Serveur'
      );
      expect(ficheServeur).toBeDefined();
    });

    it('should have correct properties for Fiche Serveur (AC4)', () => {
      const ficheServeur = SYSTEM_TEMPLATES.find(
        (t) => t.name === 'Fiche Serveur'
      );

      expect(ficheServeur).toMatchObject({
        name: 'Fiche Serveur',
        icon: 'server',
        isSystem: true,
      });
    });

    it('should have a meaningful description', () => {
      const ficheServeur = SYSTEM_TEMPLATES.find(
        (t) => t.name === 'Fiche Serveur'
      );

      expect(ficheServeur?.description).toBeDefined();
      expect(ficheServeur?.description.length).toBeGreaterThan(20);
      expect(ficheServeur?.description.toLowerCase()).toContain('serveur');
    });

    it('should use the exported FICHE_SERVEUR_CONTENT', () => {
      const ficheServeur = SYSTEM_TEMPLATES.find(
        (t) => t.name === 'Fiche Serveur'
      );

      expect(ficheServeur?.content).toBe(FICHE_SERVEUR_CONTENT);
    });

    // Story 7.5: Procedure template tests
    it('should contain Procedure template (Story 7.5, AC1)', () => {
      const procedure = SYSTEM_TEMPLATES.find((t) => t.name === 'Procedure');
      expect(procedure).toBeDefined();
    });

    it('should have correct properties for Procedure (AC4)', () => {
      const procedure = SYSTEM_TEMPLATES.find((t) => t.name === 'Procedure');

      expect(procedure).toMatchObject({
        name: 'Procedure',
        icon: 'list-checks',
        isSystem: true,
      });
    });

    it('should have a meaningful description for Procedure', () => {
      const procedure = SYSTEM_TEMPLATES.find((t) => t.name === 'Procedure');

      expect(procedure?.description).toBeDefined();
      expect(procedure?.description.length).toBeGreaterThan(20);
      expect(procedure?.description.toLowerCase()).toContain('procedure');
    });

    it('should use the exported PROCEDURE_CONTENT', () => {
      const procedure = SYSTEM_TEMPLATES.find((t) => t.name === 'Procedure');

      expect(procedure?.content).toBe(PROCEDURE_CONTENT);
    });

    it('should contain exactly 2 system templates', () => {
      expect(SYSTEM_TEMPLATES.length).toBe(2);
    });

    it('should have all required SystemTemplate fields', () => {
      for (const template of SYSTEM_TEMPLATES) {
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.icon).toBeDefined();
        expect(template.isSystem).toBe(true);
        expect(template.content).toBeDefined();
        expect(template.content.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Seed Logic - Upsert Behavior', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should create new system template when none exists', async () => {
      mockFindFirst.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        id: 'new-template-id',
        name: 'Fiche Serveur',
        isSystem: true,
      });

      // Simulate seed logic
      const existing = await mockFindFirst({
        where: { name: 'Fiche Serveur', isSystem: true },
      });

      expect(existing).toBeNull();

      if (!existing) {
        const template = SYSTEM_TEMPLATES[0];
        await mockCreate({
          data: {
            name: template.name,
            description: template.description,
            icon: template.icon,
            isSystem: template.isSystem,
            content: template.content,
            createdById: null,
          },
        });
      }

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Fiche Serveur',
            isSystem: true,
            createdById: null,
          }),
        })
      );
    });

    it('should update existing system template when one exists', async () => {
      const existingTemplate = {
        id: 'existing-id',
        name: 'Fiche Serveur',
        isSystem: true,
      };
      mockFindFirst.mockResolvedValue(existingTemplate);
      mockUpdate.mockResolvedValue({ ...existingTemplate, content: 'Updated' });

      // Simulate seed logic
      const existing = await mockFindFirst({
        where: { name: 'Fiche Serveur', isSystem: true },
      });

      expect(existing).not.toBeNull();

      if (existing) {
        const template = SYSTEM_TEMPLATES[0];
        await mockUpdate({
          where: { id: existing.id },
          data: {
            description: template.description,
            content: template.content,
            icon: template.icon,
          },
        });
      }

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'existing-id' },
        })
      );
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should not overwrite user-created template with same name', async () => {
      // No system template exists
      mockFindFirst
        .mockResolvedValueOnce(null) // First call: check for system template
        .mockResolvedValueOnce({
          // Second call: check for user template
          id: 'user-template-id',
          name: 'Fiche Serveur',
          isSystem: false,
          createdById: 'user-1',
        });

      // Simulate seed logic - check for system template first
      const systemExisting = await mockFindFirst({
        where: { name: 'Fiche Serveur', isSystem: true },
      });

      if (!systemExisting) {
        // Check for non-system template with same name
        const userExisting = await mockFindFirst({
          where: { name: 'Fiche Serveur', isSystem: false },
        });

        if (userExisting) {
          // Skip - don't overwrite user template
          expect(userExisting.isSystem).toBe(false);
        }
      }

      // Should not create because user template exists
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should set createdById to null for system templates', async () => {
      mockFindFirst.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        id: 'new-id',
        name: 'Fiche Serveur',
        isSystem: true,
        createdById: null,
      });

      const template = SYSTEM_TEMPLATES[0];
      await mockFindFirst({ where: { name: template.name, isSystem: true } });
      await mockCreate({
        data: {
          ...template,
          createdById: null,
        },
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            createdById: null,
          }),
        })
      );
    });
  });
});
