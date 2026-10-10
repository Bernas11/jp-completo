import { describe, it, expect } from "vitest";
import { bulkImportRowSchema } from "@/lib/bulk-import-schema";

describe("bulkImportRowSchema", () => {
  it("aceita uma linha válida", () => {
    const result = bulkImportRowSchema.safeParse({
      rowNumber: 2,
      fullName: "Maria Silva",
      email: "maria@example.pt",
      phone: "912345678",
      birthDate: "2000-01-15",
      concelhiaName: "Lisboa",
      citizenCardNumber: "12345678",
    });

    expect(result.success).toBe(true);
  });

  it("rejeita email inválido", () => {
    const result = bulkImportRowSchema.safeParse({
      rowNumber: 2,
      fullName: "Maria Silva",
      email: "não-é-um-email",
      phone: "912345678",
      birthDate: "2000-01-15",
      concelhiaName: "Lisboa",
      citizenCardNumber: "12345678",
    });

    expect(result.success).toBe(false);
  });

  it("rejeita concelhia em branco", () => {
    const result = bulkImportRowSchema.safeParse({
      rowNumber: 2,
      fullName: "Maria Silva",
      email: "maria@example.pt",
      phone: "912345678",
      birthDate: "2000-01-15",
      concelhiaName: "",
      citizenCardNumber: "12345678",
    });

    expect(result.success).toBe(false);
  });

  it("aceita memberNumber e joinedAt opcionais em falta", () => {
    const result = bulkImportRowSchema.safeParse({
      rowNumber: 3,
      fullName: "João Costa",
      email: "joao@example.pt",
      phone: "913456789",
      birthDate: "1998-05-20",
      concelhiaName: "Porto",
      citizenCardNumber: "87654321",
    });

    expect(result.success).toBe(true);
  });
});
