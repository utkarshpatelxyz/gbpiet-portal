/* ============================================================================
   TR INDIA — STATIC EQUIPMENT (DEPT 133)  —  REAL FRAMEWORK
   Transcribed from the department's own source documents (Master Skills
   Expectations, Expert Itinerary category manual, Interview Evaluation Kit).
   Fills the configuration template with the authentic framework.
   ============================================================================ */
const G1="G1 Equipment", G2="G2 Analysis", G3="G3 Codes & Tools", G4="G4 Project";
module.exports = {
  setup: {
    "Organization / Department"      : "TR India — Static Equipment (Dept 133)",
    "Report Title"                   : "Interview Evaluation Kit",
    "Track A Label"                  : "Engineer",
    "Track B Label"                  : "Designer",
    "Technical Scale Min"            : 0,
    "Technical Scale Max"            : 4,
    "Behavioral Scale Min"           : 1,
    "Behavioral Scale Max"           : 7,
    "Skill Weight (0-1)"             : 0.62,
    "Years Weight (0-1)"             : 0.38,
    "Meets-Ratio Threshold (0-1)"    : 0.7,
    "Seniority Signal Keywords"      : "expert, lead, led, independently, autonomous, specialist, senior, in charge, responsible for, mastery, authored, approved, supervised, review of, checked, hod, head of"
  },
  // Level Code | Short | Min Yrs | Max Yrs | Engineer title | Designer title
  levels: [
    ["L1","Trainee",  0, 1,  "Trainee Static Equipment Engineer", "Trainee Static Equipment Designer"],
    ["L2","Junior",   1, 4,  "Jr Static Equipment Engineer",      "Jr Static Equipment Designer"],
    ["L3","Eng I",    3, 9,  "Static Equipment Engineer I",       "Static Equipment Designer I"],
    ["L4","Eng II",   7, 11, "Static Equipment Engineer II",      "Static Equipment Designer II"],
    ["L5","SR I",     10,14, "Sr Static Equipment Engineer I",    "Sr Static Equipment Designer I"],
    ["L6","SR II",    13,17, "Sr Static Equipment Engineer II",   "Sr Static Equipment Designer II"],
    ["L7","Leader",   15,99, "Static Equipment Engineer Leader",  "Static Equipment Designer Leader"]
  ],
  // # | Skill | Group | Keywords | L1..L7 reference PCI (0-4)
  skills: [
    ["Drums & Separators", G1, "drum, separator, knock out, knock-out, ko drum, k.o. drum, flash drum, surge drum, slug catcher, accumulator", 0,1,2,3,3,3,4],
    ["Reactors & Columns", G1, "reactor, column, distillation, tower, fractionator, stripper, absorber, packed column, tray column", 0,0,1,2,3,3,4],
    ["Internals", G1, "internal, tray, demister, mist eliminator, distributor, vortex breaker, baffle, weir, downcomer", 0,0,1,2,2,3,3],
    ["Tanks", G1, "storage tank, api 650, api-650, api 620, api-620, atmospheric tank, floating roof, cone roof, dome roof", 0,0,0,1,2,2,3],
    ["Spheres & Bullets", G1, "sphere, bullet, spherical, lpg, mounded, pressurized storage, horton", 0,0,0,1,2,2,3],
    ["Heat Exchangers", G1, "heat exchanger, shell and tube, shell & tube, tema, exchanger, reboiler, kettle, air cooler, air-cooler, condenser, u-tube", 0,0,1,2,3,3,4],
    ["Calculations", G2, "calculation, stress analysis, sizing, thickness calc, design calculation, mechanical design, hand calc, wall thickness", 0,1,2,3,3,3,4],
    ["Seismic & Wind Loads", G2, "seismic, wind load, earthquake, asce 7, asce-7, is 1893, dynamic analysis, response spectrum", 0,0,1,2,3,3,4],
    ["Nozzle Loads", G2, "nozzle load, nozzle loads, wrc 107, wrc 297, wrc-107, wrc297, local stress, fea nozzle, pad reinforcement", 0,1,2,3,3,3,4],
    ["Anchoring & Supports", G2, "skirt, saddle, support design, anchor bolt, lug support, leg support, base ring, support ring, vessel support", 0,0,1,2,3,3,3],
    ["Lifting & Transport", G2, "lifting, lifting lug, rigging, heavy lift, transport analysis, trunnion, tailing, lift plan", 0,0,1,2,2,3,3],
    ["ASME Sec VIII Div 1", G3, "asme viii div 1, div 1, div.1, division 1, section viii div 1, u-stamp, u stamp, asme sec viii", 0,1,2,3,3,3,4],
    ["ASME Sec VIII Div 2", G3, "div 2, div.2, division 2, design by analysis, design-by-analysis, dba, elastic-plastic, asme viii div 2", 0,0,1,2,2,3,3],
    ["PV Elite / Compress", G3, "pv elite, pvelite, pv-elite, compress, codeware, nozzlepro, nozzle pro", 0,1,2,3,3,4,4],
    ["Ametank", G3, "ametank, tank software", 0,0,0,1,1,2,2],
    ["CAD / Microstation", G3, "autocad, microstation, auto cad, cad, 3d model, pdms, sp3d, smartplant, navisworks, drafting", 0,0,0,1,1,1,2],
    ["Proposals / Conceptual", G4, "proposal, conceptual, bid, tender, estimation, feasibility, fel, pre-feed, budgetary", 0,0,0,1,2,2,3],
    ["FEED", G4, "feed, front end engineering, front-end engineering, basic engineering, basic design package", 0,0,1,2,2,3,3],
    ["EPC", G4, "epc, detailed engineering, vddr, vendor document, construction support, as-built, tbe, technical bid", 0,1,2,3,3,3,4],
    ["Oil&Gas / Petrochemical", G4, "oil and gas, oil & gas, petrochemical, refinery, refining, lng, offshore, onshore, upstream, downstream, chemical plant, fertilizer, hydrocarbon", 0,0,1,2,3,3,4]
  ],
  // Dimension | Keywords | Years Weight | Link Group | L1..L7 expected (JCS 1-7)
  behavioral: [
    ["Technical Mastery",        "design, analysis, calculation, engineering, expertise",              "Medium", "All", 1,2,3,4,5,6,7],
    ["Standards & Procedures",   "procedure, standard, code, asme, specification, compliance, deviation","Low",   G3,    1,2,3,4,5,6,7],
    ["Tools & Software",         "pv elite, compress, ametank, autocad, software, cad, tool",           "Low",    G3,    1,2,3,4,5,6,7],
    ["External Engagement",      "client, vendor, site visit, kom, hazop, meeting, supplier",           "Medium", "All", 1,2,3,4,5,6,7],
    ["Leadership & Development", "lead, mentor, manage, supervise, train, team of, head",               "High",   "All", 1,2,3,4,5,6,7],
    ["Decision & Coordination",  "coordinate, independent, decision, multidisciplinary, interface",     "Medium", "All", 1,2,3,4,5,6,7]
  ],
  // Competency | Keywords | Years Weight | descriptor L1..L7
  competencies: [
    ["Autonomy & Decision-Making", "independent, autonomous, lead, own", "High",
      "None","Limited","Medium","High","Full","Full + Supervises","Strategic decisions"],
    ["Quality Management", "qa, qc, quality, audit, review, checked", "Medium",
      "Follows proc.","Applies basic","Reports deviations","Defines stds","Manages QA","Leads QA reviews","Defines QA strategy"],
    ["Client / Vendor Interaction", "client, vendor, supplier, site visit, document review", "Medium",
      "None","None","Supports docs","Vendor visits","Client meetings","KOM / HAZOP lead","Full client mgmt"],
    ["Mentoring & Teaching", "mentor, train, supervise, guided, self, develop", "High",
      "Receives trng","Learning","Self-developing","Takes ownership","Provides trng","Supervises eng.","Mentors leaders"],
    ["Multidisciplinary Coord.", "multidisciplinary, coordinate, interface, interdisciplinary, team", "Medium",
      "None","Within team","Regular contact","Frequent coord.","Interdept.","Ensures integr.","Full coordination"]
  ],
  // Section | Topic | Q1 | Q2 | Q3
  questions: [
    ["A","Drums & Separators","Tell me about the types of drums or separators you have designed or reviewed.","Walk me through your approach when starting a new drum design from a process datasheet.","Describe a situation where a drum design required special considerations."],
    ["A","Reactors & Columns","What is your experience with reactor or column design?","How do you handle the interaction between internals and shell design in a column?","Tell me about the most complex column you have worked on."],
    ["A","Internals","What types of vessel internals have you worked with?","How do you approach vendor internals packages review?","Describe a case where internals affected the overall equipment design."],
    ["A","Tanks","What experience do you have with storage tank design — API 650, API 620?","Walk me through the main steps of designing an atmospheric storage tank.","Have you dealt with floating roof or special tank configurations?"],
    ["A","Spheres & Bullets","Tell me about any experience you have with spheres or bullet tanks.","What makes sphere design different from standard pressure vessel design?","Have you worked with LPG or pressurized gas storage projects?"],
    ["A","Heat Exchangers","What types of heat exchangers have you designed or reviewed?","How do you coordinate between thermal and mechanical design?","Tell me about your experience applying TEMA standards."],
    ["A","Calculations","Walk me through the typical calculations you prepare for static equipment.","How do you check and validate your own calculation results?","Tell me about the most challenging calculation package you have prepared."],
    ["A","Seismic & Wind Loads","How do you approach seismic and wind analysis for tall or heavy vessels?","Which codes do you use for seismic design, and how do you select parameters?","Describe a project where environmental loads significantly impacted the design."],
    ["A","Nozzle Loads","How do you evaluate nozzle loads on pressure vessels?","What tools or methods do you use for local stress assessment at nozzles?","Tell me about a case where nozzle loads required a design change."],
    ["A","Anchoring & Supports","What is your experience designing vessel supports — skirts, saddles, legs?","Walk me through your approach to anchor bolt design.","Describe a project where the support design was particularly challenging."],
    ["A","Lifting & Transport","How do you approach lifting lug design and transport analysis?","What safety factors and standards do you apply for lifting?","Have you been involved in planning or supporting heavy lift operations?"],
    ["A","ASME Sec VIII Div 1","Which parts of ASME VIII Div 1 do you use most frequently?","Walk me through how you determine minimum wall thickness for a pressure vessel.","How do you handle special conditions like cyclic or lethal service?"],
    ["A","ASME Sec VIII Div 2","Have you applied ASME VIII Div 2? When would you choose it over Div 1?","Tell me about your experience with the Design-by-Analysis approach.","What advantages and limitations have you found with Div 2?"],
    ["A","PV Elite / Compress","Which pressure vessel software do you use? Tell me about your proficiency.","How do you verify that software results are correct?","Describe a complex model you have built in PV Elite, Compress, or similar."],
    ["A","Ametank","Have you used Ametank or other tank design software? For what type of tanks?","What level of proficiency would you say you have with tank design tools?","How do you handle seismic or wind analysis within the software?"],
    ["A","CAD / Microstation","What CAD tools do you use in your engineering work?","Do you create or review detailed fabrication drawings?","How does CAD support your engineering workflow day to day?"],
    ["A","Proposals / Conceptual","Have you participated in proposal or conceptual phases? What was your contribution?","How do you size equipment when project information is still limited?","Tell me about a proposal where your input was important."],
    ["A","FEED","Describe your FEED project experience — what deliverables do you produce?","How do you handle design decisions when the project basis is still evolving?","What coordination challenges have you faced in FEED projects?"],
    ["A","EPC","Walk me through your experience in EPC projects.","How do you manage vendor document reviews (VDDR, TBA)?","How do you handle deliverable deadlines and quality in EPC execution?"],
    ["A","Oil&Gas / Petrochemical","What industry sectors have you worked in?","How do requirements differ between sectors for static equipment?","Tell me about the project that best represents your industry experience."],
    ["B","Technical Mastery","How do you keep your technical knowledge up to date?","Describe a situation where your technical expertise solved a critical problem.","Where do you see your biggest room for technical growth?"],
    ["B","Standards & Procedures","How do you ensure your work complies with codes and standards?","Have you ever found a deviation from standards? How did you handle it?","Tell me how you apply company procedures alongside international codes."],
    ["B","Tools & Software","Which engineering tools are you most proficient with?","How do you approach learning a new tool required for your work?","Tell me how software tools improve your productivity."],
    ["B","External Engagement","Describe your experience interacting with clients or vendors.","Have you participated in technical meetings with external parties?","How do you manage technical disagreements with vendors or clients?"],
    ["B","Leadership & Development","Have you mentored or trained junior colleagues? How?","How do you take ownership of your own professional development?","Tell me about a time you led a technical effort or team initiative."],
    ["B","Decision & Coordination","Describe a time you made an important technical decision on your own.","How do you coordinate your work with other disciplines?","Tell me about a situation where coordination was critical to the result."],
    ["C","Autonomy & Decision-Making","How much supervision do you typically need in your current role?","Tell me about a decision you made without consulting your supervisor.","What types of engineering decisions are you comfortable making on your own?"],
    ["C","Quality Management","How do you ensure quality in your deliverables before submitting them?","Have you been involved in quality audits or non-conformance resolution?","Tell me about your experience with QA/QC in engineering projects."],
    ["C","Client / Vendor Interaction","Describe your level of interaction with clients and vendors.","Have you led or participated in KOMs, HAZOPs, or technical clarification meetings?","How do you handle a vendor deliverable that does not meet specifications?"],
    ["C","Mentoring & Teaching","Have you trained or guided colleagues? What was your approach?","How do you share knowledge within your team?","Describe your own learning path — how have you grown in your career?"],
    ["C","Multidisciplinary Coord.","How often do you coordinate with other engineering disciplines?","Tell me about a situation where multidisciplinary coordination was essential?","How do you resolve conflicting requirements from different disciplines?"]
  ]
};
