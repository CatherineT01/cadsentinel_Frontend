import type { DrawingType, Rule, Section } from "./types"

export const DRAWING_TYPES: DrawingType[] = [
  "REH",
  "CEH",
  "Gland",
  "Piston",
  "Barrel",
  "Rod",
  "Acc/Misc",
  "Assy",
  "PRO",
]

export const DRAWING_TYPE_LABELS: Record<DrawingType, string> = {
  REH: "Rod End Head",
  CEH: "Cap End Head",
  Gland: "Gland",
  Piston: "Piston",
  Barrel: "Barrel / Tube",
  Rod: "Piston Rod",
  "Acc/Misc": "Accessory / Misc",
  Assy: "Assembly",
  PRO: "Process / Procedure",
}

export const SECTIONS: Section[] = [
  "Title Block",
  "Standard Notes",
  "Cylinder Specifications",
  "Dimension Units",
  "Confidentiality",
]

const ALL: DrawingType[] = [...DRAWING_TYPES]
const COMPONENTS: DrawingType[] = ["REH", "CEH", "Gland", "Piston", "Barrel", "Rod"]

export const RULES: Rule[] = [
  // Title Block (5)
  {
    id: "R01",
    rule_code: "TB-01",
    section: "Title Block",
    description: "Company name and logo present in title block",
    applicable_drawing_types: ALL,
  },
  {
    id: "R02",
    rule_code: "TB-02",
    section: "Title Block",
    description: "Drawing number follows JIT-XXXXXX-RV format",
    applicable_drawing_types: ALL,
  },
  {
    id: "R03",
    rule_code: "TB-03",
    section: "Title Block",
    description: "Revision block complete with date and description",
    applicable_drawing_types: ALL,
  },
  {
    id: "R04",
    rule_code: "TB-04",
    section: "Title Block",
    description: "Drafter and approver fields populated",
    applicable_drawing_types: ALL,
  },
  {
    id: "R05",
    rule_code: "TB-05",
    section: "Title Block",
    description: "Drawing scale explicitly specified",
    applicable_drawing_types: ["REH", "CEH", "Gland", "Piston", "Barrel", "Rod", "Acc/Misc", "Assy"],
  },
  // Standard Notes (4)
  {
    id: "R06",
    rule_code: "SN-01",
    section: "Standard Notes",
    description: "General tolerance note present per JIT-STD-100",
    applicable_drawing_types: [...COMPONENTS, "Acc/Misc", "Assy"],
  },
  {
    id: "R07",
    rule_code: "SN-02",
    section: "Standard Notes",
    description: "Surface finish note present (Ra values declared)",
    applicable_drawing_types: [...COMPONENTS, "Acc/Misc"],
  },
  {
    id: "R08",
    rule_code: "SN-03",
    section: "Standard Notes",
    description: "Material specification note present",
    applicable_drawing_types: [...COMPONENTS, "Acc/Misc"],
  },
  {
    id: "R09",
    rule_code: "SN-04",
    section: "Standard Notes",
    description: "Heat treatment / hardness note present where required",
    applicable_drawing_types: ["Piston", "Rod", "Gland", "REH", "CEH"],
  },
  // Cylinder Specifications (5)
  {
    id: "R10",
    rule_code: "CS-01",
    section: "Cylinder Specifications",
    description: "Bore diameter callout present and toleranced",
    applicable_drawing_types: ["Barrel", "Piston", "Assy", "REH", "CEH"],
  },
  {
    id: "R11",
    rule_code: "CS-02",
    section: "Cylinder Specifications",
    description: "Rod diameter callout present and toleranced",
    applicable_drawing_types: ["Rod", "Gland", "Assy"],
  },
  {
    id: "R12",
    rule_code: "CS-03",
    section: "Cylinder Specifications",
    description: "Stroke length specified on assembly",
    applicable_drawing_types: ["Assy", "PRO"],
  },
  {
    id: "R13",
    rule_code: "CS-04",
    section: "Cylinder Specifications",
    description: "Operating pressure rating present",
    applicable_drawing_types: ["Assy", "Barrel", "PRO"],
  },
  {
    id: "R14",
    rule_code: "CS-05",
    section: "Cylinder Specifications",
    description: "Port size and thread callout present",
    applicable_drawing_types: ["Barrel", "REH", "CEH", "Assy"],
  },
  // Dimension Units (3)
  {
    id: "R15",
    rule_code: "DU-01",
    section: "Dimension Units",
    description: "Primary dimensioning units declared (inch or mm)",
    applicable_drawing_types: ALL,
  },
  {
    id: "R16",
    rule_code: "DU-02",
    section: "Dimension Units",
    description: "Dual dimensioning applied consistently",
    applicable_drawing_types: [...COMPONENTS, "Assy"],
  },
  {
    id: "R17",
    rule_code: "DU-03",
    section: "Dimension Units",
    description: "Angular units and precision specified",
    applicable_drawing_types: [...COMPONENTS, "Assy"],
  },
  // Confidentiality (4)
  {
    id: "R18",
    rule_code: "CF-01",
    section: "Confidentiality",
    description: "Proprietary statement present",
    applicable_drawing_types: ALL,
  },
  {
    id: "R19",
    rule_code: "CF-02",
    section: "Confidentiality",
    description: "Copyright notice present with current year",
    applicable_drawing_types: ALL,
  },
  {
    id: "R20",
    rule_code: "CF-03",
    section: "Confidentiality",
    description: "Distribution restriction marking present",
    applicable_drawing_types: ALL,
  },
  {
    id: "R21",
    rule_code: "CF-04",
    section: "Confidentiality",
    description: "Export control (ITAR/EAR) notice present where applicable",
    applicable_drawing_types: ["Assy", "PRO", "Rod", "Barrel"],
  },
]

export function ruleById(id: string): Rule | undefined {
  return RULES.find((r) => r.id === id)
}

export function ruleByCode(code: string): Rule | undefined {
  return RULES.find((r) => r.rule_code === code)
}
