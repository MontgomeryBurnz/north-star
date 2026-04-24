export type Profile = {
  id: string;
  positioning: string;
  operatingThesis: string;
  focusAreas: string[];
  roleFit: string[];
  principles: string[];
};

export const profile: Profile = {
  id: "operator-profile",
  positioning: "AI-assisted work path clarity for delivery leads managing active programs.",
  operatingThesis: "Clarity for the work ahead.",
  focusAreas: [
    "program inputs",
    "delivery risk",
    "stakeholder alignment",
    "recommended plans",
    "clear next steps"
  ],
  roleFit: [
    "product leadership with operating-model ambiguity",
    "CX transformation tied to measurable friction",
    "AI product work requiring trust, controls, and adoption design"
  ],
  principles: [
    "start with the constraint",
    "make decision rights explicit",
    "ship the smallest useful system",
    "instrument adoption before scaling"
  ]
};
