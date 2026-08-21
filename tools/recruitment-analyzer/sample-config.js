/* ============================================================================
   SAMPLE CONFIGURATION DATA  (NEUTRAL / NON-CONFIDENTIAL)
   ----------------------------------------------------------------------------
   This is a generic placeholder framework used to (a) show the user the exact
   format the tool expects and (b) act as a test fixture. It is deliberately NOT
   any real company framework. The user replaces every value with their own.
   ============================================================================ */
module.exports = {
  setup: {
    "Organization / Department"      : "SAMPLE — Mechanical Design Department",
    "Report Title"                   : "Candidate Evaluation Kit",
    "Track A Label"                  : "Engineer",
    "Track B Label"                  : "Designer",
    "Technical Scale Min"            : 0,
    "Technical Scale Max"            : 4,
    "Behavioral Scale Min"           : 1,
    "Behavioral Scale Max"           : 7,
    "Skill Weight (0-1)"             : 0.6,
    "Years Weight (0-1)"             : 0.4,
    "Meets-Ratio Threshold (0-1)"    : 0.7,
    "Seniority Signal Keywords"      : "lead, led, senior, expert, independently, responsible for, in charge, supervised, mentored, approved, reviewed, specialist"
  },
  // Level Code | Short Name | Min Yrs | Max Yrs | Track A Title | Track B Title
  levels: [
    ["L1","Trainee",  0, 1,  "Trainee Engineer",     "Trainee Designer"],
    ["L2","Junior",   1, 4,  "Junior Engineer",      "Junior Designer"],
    ["L3","Mid",      3, 8,  "Engineer",             "Designer"],
    ["L4","Senior",   7, 13, "Senior Engineer",      "Senior Designer"],
    ["L5","Lead",     12,99, "Lead Engineer",        "Lead Designer"]
  ],
  // # | Skill | Group | Keywords | ref score per level (L1..L5)
  skills: [
    ["Component Design",     "G1 Design",   "component design, part design, sizing, dimensioning, gd&t", 1,2,3,3,4],
    ["Assembly Design",      "G1 Design",   "assembly, bill of materials, bom, tolerance stack, fit", 0,1,2,3,4],
    ["Detailing & Drawings", "G1 Design",   "detailing, detail drawing, drafting, gd&t, drawing release", 1,2,3,3,3],
    ["Stress & Calculations","G2 Analysis", "stress analysis, calculation, hand calc, sizing, load case", 0,1,2,3,4],
    ["FEA / Simulation",     "G2 Analysis", "fea, finite element, ansys, abaqus, simulation, meshing", 0,0,1,2,3],
    ["CAD Software",         "G3 Tools",    "solidworks, autocad, creo, catia, nx, inventor, 3d model", 1,2,3,3,4],
    ["Standards & Codes",    "G3 Tools",    "asme, iso, din, standard, code, specification, compliance", 0,1,2,3,3],
    ["Project Delivery",     "G4 Project",  "project, deliverable, schedule, vendor, client, coordination, review", 0,1,2,3,4]
  ],
  // Dimension | Keywords | Years Weight | Link Group | expected per level (L1..L5)
  behavioral: [
    ["Technical Mastery",       "design, analysis, calculation, engineering",           "Medium","All",     1,3,4,5,7],
    ["Standards & Procedures",  "standard, code, procedure, specification, compliance", "Low","G3 Tools",   1,3,4,5,6],
    ["Tools & Software",        "cad, solidworks, ansys, software, simulation",         "Low","G3 Tools",   1,3,4,5,6],
    ["Collaboration & Comms",   "client, vendor, meeting, team, coordination, present", "High","All",       1,2,4,5,7]
  ],
  // Competency | Keywords | Years Weight | descriptor per level (L1..L5)
  competencies: [
    ["Autonomy",        "independent, autonomous, own, self, lead",        "High",
      "Needs supervision","Guided work","Works independently","Owns deliverables","Leads & directs"],
    ["Quality & Review","quality, review, check, audit, verify, approve",   "Medium",
      "Follows checks","Applies checks","Reviews own work","Reviews others","Owns QA process"],
    ["Mentoring",       "mentor, train, guide, coach, teach, supervise",    "High",
      "Receives training","Self-developing","Shares knowledge","Trains juniors","Mentors the team"]
  ],
  // Section (A/B/C) | Topic (matches a skill/dimension/competency) | Q1 | Q2 | Q3
  questions: [
    ["A","Component Design","Walk me through a component you designed from scratch.","How do you decide dimensions and tolerances?","Describe a design that had to be reworked and why."],
    ["A","FEA / Simulation","What simulations have you run and in which tool?","How do you validate that a simulation result is trustworthy?","Tell me about a load case that surprised you."],
    ["B","Collaboration & Comms","Describe working with a vendor or client.","How do you handle a technical disagreement?","Tell me about a cross-team coordination you led."],
    ["C","Autonomy","How much supervision does your current role need?","Describe a decision you made without asking first.","What work are you fully comfortable owning?"]
  ]
};
