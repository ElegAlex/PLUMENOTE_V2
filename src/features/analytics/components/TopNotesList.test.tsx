/**
 * @vitest-environment jsdom
 * Tests for TopNotesList component
 * @see Story 10.4: Dashboard Statistiques Admin (FR46)
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopNotesList } from "./TopNotesList";
import type { TopNote } from "../types/admin-stats";

describe("TopNotesList", () => {
  const mockNotes: TopNote[] = [
    { id: "note-1", title: "Popular Note", viewCount: 150, workspaceName: "Team" },
    { id: "note-2", title: "Second Note", viewCount: 100, workspaceName: null },
    { id: "note-3", title: "Third Note", viewCount: 50, workspaceName: "Project X" },
  ];

  describe("rendering", () => {
    it("should render component title", () => {
      render(<TopNotesList notes={mockNotes} />);
      expect(screen.getByText("Notes les plus consultées")).toBeInTheDocument();
    });

    it("should render table headers", () => {
      render(<TopNotesList notes={mockNotes} />);
      expect(screen.getByText("#")).toBeInTheDocument();
      expect(screen.getByText("Titre")).toBeInTheDocument();
      expect(screen.getByText("Vues")).toBeInTheDocument();
    });

    it("should render all notes", () => {
      render(<TopNotesList notes={mockNotes} />);
      expect(screen.getByText("Popular Note")).toBeInTheDocument();
      expect(screen.getByText("Second Note")).toBeInTheDocument();
      expect(screen.getByText("Third Note")).toBeInTheDocument();
    });

    it("should render ranking numbers", () => {
      render(<TopNotesList notes={mockNotes} />);
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("should render view counts formatted", () => {
      render(<TopNotesList notes={mockNotes} />);
      expect(screen.getByText("150")).toBeInTheDocument();
      expect(screen.getByText("100")).toBeInTheDocument();
      expect(screen.getByText("50")).toBeInTheDocument();
    });

    it("should render workspace badges when present", () => {
      render(<TopNotesList notes={mockNotes} />);
      expect(screen.getByText("Team")).toBeInTheDocument();
      expect(screen.getByText("Project X")).toBeInTheDocument();
    });

    it("should render note links", () => {
      render(<TopNotesList notes={mockNotes} />);
      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(3);
      expect(links[0]).toHaveAttribute("href", "/notes/note-1");
      expect(links[1]).toHaveAttribute("href", "/notes/note-2");
      expect(links[2]).toHaveAttribute("href", "/notes/note-3");
    });

    it("should display 'Sans titre' for notes without title", () => {
      const notesWithEmptyTitle: TopNote[] = [
        { id: "note-1", title: "", viewCount: 100, workspaceName: null },
      ];
      render(<TopNotesList notes={notesWithEmptyTitle} />);
      expect(screen.getByText("Sans titre")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("should show empty message when no notes", () => {
      render(<TopNotesList notes={[]} />);
      expect(screen.getByText("Aucune note consultée")).toBeInTheDocument();
    });

    it("should show icon in empty state", () => {
      render(<TopNotesList notes={[]} />);
      const icon = document.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("should show skeleton when loading", () => {
      render(<TopNotesList notes={[]} loading={true} />);
      const card = document.querySelector('[aria-busy="true"]');
      expect(card).toBeInTheDocument();
    });

    it("should not show notes when loading", () => {
      render(<TopNotesList notes={mockNotes} loading={true} />);
      expect(screen.queryByText("Popular Note")).not.toBeInTheDocument();
    });

    it("should not show table when loading", () => {
      render(<TopNotesList notes={mockNotes} loading={true} />);
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });
});
