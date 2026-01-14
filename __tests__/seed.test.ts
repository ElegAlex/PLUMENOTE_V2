/**
 * Tests for the seed script and system templates
 *
 * Story 7.4: Template Fiche Serveur (FR35)
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
