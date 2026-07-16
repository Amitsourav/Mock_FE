/**
 * ============================================================================
 * DRAFT COPY — PENDING PRODUCT/CONTENT REVIEW. DO NOT SHIP UNVERIFIED.
 * ============================================================================
 *
 * Marketing copy for the pre-auth brand panel. Hardcoded on purpose: this
 * renders on the login screen, and GET /exams requires a Bearer token (401
 * unauthenticated), so the backend cannot be the source here. Nothing in this
 * file is the backend's exam list — it is copy that happens to name exams.
 *
 * Two things a reviewer must check before this ships:
 *
 * 1. AVAILABILITY. This advertises seven exams the backend does not yet offer;
 *    /exams currently returns dMAT alone. A visitor who arrives for CAT will
 *    register and find only dMAT in the dropdown. Product accepted this
 *    trade-off knowingly — re-confirm it still holds at launch.
 *
 * 2. FACTS. Every claim marked TODO(content-review) is a real-world exam detail
 *    that has changed within the last ~3 years. Verify against the official
 *    source before shipping; wrong specifics on a prep platform cost more
 *    credibility than they buy.
 */

export type ShowcaseCardKind = "benefit" | "tip";

export type ShowcaseCard = {
  /** benefit = what sitting this mock gives you. tip = how to prepare. Drives icon + label only. */
  kind: ShowcaseCardKind;
  /** <= 24 chars — the card's own eyebrow. */
  label: string;
  /** <= 110 chars — must fit a 120px-tall card in a narrow column. */
  body: string;
};

/**
 * Exactly 15. The marquee is 3 columns x 5 cards and its seamless-loop maths
 * depends on that count, so a wrong length is a compile error rather than a
 * silently torn animation.
 */
type Cards15 = readonly [
  ShowcaseCard,
  ShowcaseCard,
  ShowcaseCard,
  ShowcaseCard,
  ShowcaseCard,
  ShowcaseCard,
  ShowcaseCard,
  ShowcaseCard,
  ShowcaseCard,
  ShowcaseCard,
  ShowcaseCard,
  ShowcaseCard,
  ShowcaseCard,
  ShowcaseCard,
  ShowcaseCard,
];

export type ShowcaseExam = {
  /** Short code, e.g. "CAT". Used as a React key. */
  code: string;
  name: string;
  /**
   * The phrase the panel types out. Kept <= 41 chars: longer strings push the
   * dwell past 9s and wrap the eyebrow to a second line, which reflows the
   * whole bottom block. This is why it is not just `${code} — ${name}`.
   */
  eyebrow: string;
  /** <= 76 chars — two lines at max-w-[38ch]. Longer shoves the headline upward. */
  tagline: string;
  cards: Cards15;
};

/**
 * Facts below are taken from the official sources, not inferred:
 *   https://www.d-mat.de/en/          (g.a.s.t. — test structure, duration, scoring)
 *   https://aps-india.de/dmat/        (APS India — intake, disciplines, fee, dates)
 * Verified 2026-07-16. Re-check before each intake: the 2026 dates below expire.
 *
 * Load-bearing facts: developed by g.a.s.t. with Ulm and Kassel (DAAD-supported);
 * Core Module (three subtests of general cognitive skill) + Subject Module;
 * 3.5 hours WITH A BREAK between modules; single-choice, English; scored as a
 * percentile rank plus a dMAT score 0-200 with mean 100; certificates valid
 * indefinitely; EUR 150 at registration; required part of APS documentation from
 * Summer Semester 2027 for Engineering, Commerce/Accounting/Finance/Economics and
 * Business/Management graduates; India APS requires the General Academic Module.
 *
 * TODO(content-review): "Digital Master Test" matches GET /exams, but d-mat.de
 * titles it "Digital Master Assessment Test". Confirm which name we use publicly.
 * TODO(content-review): the 2026 cycle is a single date (26 Sep). Whether a
 * retake/second sitting exists is NOT stated by either source — no card claims one.
 */
const DMAT: ShowcaseExam = {
  code: "dMAT",
  name: "Digital Master Test",
  eyebrow: "dMAT — Digital Master Test",
  tagline: "Required for APS from Summer 2027. Sit a full mock before 26 September.",
  cards: [
    {
      kind: "benefit",
      label: "Core + Subject",
      body: "The real paper is two modules: a Core Module of three cognitive subtests, then a Subject Module.",
    },
    {
      kind: "benefit",
      label: "Scored 0 to 200",
      body: "Your certificate carries a dMAT score from 0 to 200, where 100 is the mean — plus your percentile rank.",
    },
    {
      kind: "benefit",
      label: "The break, rehearsed",
      body: "3h30m with a break between modules. Practise the restart — coming back cold is its own skill.",
    },
    {
      kind: "benefit",
      label: "General Academic Module",
      body: "APS India requires the General Academic Module. That is the one to mock, whatever your degree.",
    },
    {
      kind: "benefit",
      label: "Single-choice, English",
      body: "Every task g.a.s.t. sets is single-choice and in English. No written answers, no translation layer.",
    },
    {
      kind: "benefit",
      label: "Built by g.a.s.t.",
      body: "Developed with Ulm and Kassel and backed by the DAAD — the same house that runs TestAS and onSET.",
    },
    {
      kind: "benefit",
      label: "Sit it once",
      body: "dMAT certificates are valid indefinitely. One good sitting carries every application you make.",
    },
    {
      kind: "tip",
      label: "APS waits on dMAT",
      body: "APS India cannot issue your certificate until your dMAT result is in. It gates your whole file.",
    },
    {
      kind: "tip",
      label: "26 September 2026",
      body: "One sitting this cycle. Registration closes 15 September and certificates land 12 October.",
    },
    {
      kind: "tip",
      label: "Summer 2027 onward",
      body: "Mandatory for Engineering, Commerce, Finance, Economics, Business and Management graduates.",
    },
    {
      kind: "tip",
      label: "Ten centres",
      body: "Delhi, Mumbai, Bengaluru, Chennai, Kolkata, Pune, Ahmedabad, Bhopal, Chandigarh, Mananthavady.",
    },
    {
      kind: "tip",
      label: "Revise your Bachelor's",
      body: "The Subject Module tests knowledge from your previous degree and whether you can apply it. Go back to it.",
    },
    {
      kind: "tip",
      label: "Score is not admission",
      body: "The dMAT does not decide your place. Each university sets its own weight — a strong score only opens doors.",
    },
    {
      kind: "tip",
      label: "It does not replace APS",
      body: "dMAT is an addition to APS verification, not a substitute. You still need the full document check.",
    },
    {
      kind: "tip",
      label: "EUR 150 at registration",
      body: "g.a.s.t. charges the fee when you register, not on test day. Budget it alongside your APS costs.",
    },
  ],
};

/**
 * For every exam below except dMAT we do not yet run a mock, so "benefit" cards
 * describe the real exam's structure and scoring — claims that stay true whether
 * or not the product ships — rather than advertising a sitting that does not
 * exist. Keep it that way until /exams actually returns them.
 *
 * TODO(content-review): every format below changed within the last ~3 years.
 * Verify against the official source before shipping — a prep platform quoting a
 * retired format is the fastest way to lose a candidate's trust.
 */

/** TODO(content-review): CAT 2026 — question count and the conducting IIM move yearly. */
const CAT: ShowcaseExam = {
  code: "CAT",
  name: "Common Admission Test",
  eyebrow: "CAT — Common Admission Test",
  tagline: "Three sections, three clocks, one percentile. Practise the timing.",
  cards: [
    {
      kind: "benefit",
      label: "Sectional percentile",
      body: "VARC, DILR and QA are scored as three separate percentiles — the way an IIM shortlist actually reads you.",
    },
    {
      kind: "benefit",
      label: "40 minutes, then locked",
      body: "Each section gets 40 minutes and closes for good. You cannot bank time or go back to VARC from QA.",
    },
    {
      kind: "benefit",
      label: "Normalised across slots",
      body: "Three slots sit different papers, so scores are normalised. A hard slot does not cost you a percentile.",
    },
    {
      kind: "benefit",
      label: "TITA carries no penalty",
      body: "Type-in-the-answer questions have no negative marking. A blank TITA and a wrong TITA score the same.",
    },
    {
      kind: "benefit",
      label: "Plus 3, minus 1",
      body: "MCQs pay 3 and cost 1. Two wrong guesses erase a right answer — accuracy beats attempts.",
    },
    {
      kind: "benefit",
      label: "On-screen calculator",
      body: "Only the basic on-screen calculator is allowed. Practise with it, not with the one on your desk.",
    },
    {
      kind: "benefit",
      label: "Percentile, not marks",
      body: "You are ranked against everyone who sat it. 99th percentile moves with the cohort, not a fixed score.",
    },
    {
      kind: "tip",
      label: "Choose your DILR sets",
      body: "DILR is set selection first, solving second. Five minutes picking the right sets beats forty on the wrong one.",
    },
    {
      kind: "tip",
      label: "VARC is mostly RC",
      body: "Reading comprehension dominates VARC. Para-jumbles and odd-one-out are the minority — train reading speed.",
    },
    {
      kind: "tip",
      label: "Arithmetic runs QA",
      body: "Arithmetic outweighs geometry and algebra in QA. Percentages, ratios and time-work repay revision most.",
    },
    {
      kind: "tip",
      label: "Clear sectional cutoffs",
      body: "IIMs set a minimum percentile per section. A 99 overall with a weak DILR still misses the shortlist.",
    },
    {
      kind: "tip",
      label: "Never leave a section",
      body: "You cannot return, so spend the full 40 minutes. An abandoned section is a percentile you gave away.",
    },
    {
      kind: "tip",
      label: "Attempt count is a trap",
      body: "Chasing attempts invites negatives. In DILR, 12 accurate attempts routinely beat 20 rushed ones.",
    },
    {
      kind: "tip",
      label: "Sit the whole 120",
      body: "The paper is two hours of unbroken switching between three modes. Practise the switch, not just the maths.",
    },
    {
      kind: "tip",
      label: "The profile counts too",
      body: "Percentile only earns the interview. Academics, work experience and diversity feed the final IIM call.",
    },
  ],
};

/** TODO(content-review): JEE Main marking and the optional-questions rule changed in 2023-25. */
const JEE: ShowcaseExam = {
  code: "IIT-JEE",
  name: "Joint Entrance Examination",
  eyebrow: "IIT-JEE — Joint Entrance Exam",
  tagline: "Main is a percentile. Advanced is a different exam. Prepare for both.",
  cards: [
    {
      kind: "benefit",
      label: "Two exams, not one",
      body: "JEE Main qualifies you. JEE Advanced admits you to the IITs. They test the same syllabus very differently.",
    },
    {
      kind: "benefit",
      label: "NTA percentile score",
      body: "Main is normalised into an NTA percentile across sessions, so your raw marks are not your rank.",
    },
    {
      kind: "benefit",
      label: "Best of two sessions",
      body: "Main runs in two sessions and your better NTA score counts. Session 1 is a real attempt, not a rehearsal.",
    },
    {
      kind: "benefit",
      label: "Plus 4, minus 1",
      body: "Physics, Chemistry and Maths across 300 marks in three hours. Numerical questions carry the penalty too.",
    },
    {
      kind: "benefit",
      label: "Advanced shifts yearly",
      body: "Two papers in one day, and the marking scheme changes yearly — partial credit, multi-correct, no pattern.",
    },
    {
      kind: "benefit",
      label: "JoSAA decides the seat",
      body: "Your Advanced rank feeds JoSAA counselling. Branch and institute come from the choice list you fill.",
    },
    {
      kind: "benefit",
      label: "Three subjects, equal",
      body: "Each subject carries the same marks. Skip chemistry and you lose a third of the paper.",
    },
    {
      kind: "tip",
      label: "NCERT owns Chemistry",
      body: "Inorganic chemistry tracks NCERT almost line by line. It is the cheapest full marks on the paper.",
    },
    {
      kind: "tip",
      label: "Previous years, twice",
      body: "Ten years of past papers teach the setter's habits. Solve them, then re-solve the ones you got wrong.",
    },
    {
      kind: "tip",
      label: "Main rewards speed",
      body: "Main is 75 questions in 180 minutes. Advanced rewards depth. Training only for depth costs you Main.",
    },
    {
      kind: "tip",
      label: "Guessing costs you",
      body: "With minus 1 live on numericals too, a coin-flip attempt has negative expected value. Leave it blank.",
    },
    {
      kind: "tip",
      label: "Main gates Advanced",
      body: "Only the top slice of Main qualifies for Advanced. Clearing the cutoff is a target in its own right.",
    },
    {
      kind: "tip",
      label: "Mock at 9am",
      body: "Paper 1 starts in the morning. If every mock you sit is at midnight, you have trained the wrong brain.",
    },
    {
      kind: "tip",
      label: "One concept, three ways",
      body: "Advanced rarely asks a formula plainly. Learn each concept until you can attack it from any direction.",
    },
    {
      kind: "tip",
      label: "Board marks still gate",
      body: "IITs require a board percentage or top-20 percentile to admit you. A great rank with weak boards stalls.",
    },
  ],
};

/** TODO(content-review): One Skill Retake availability varies by centre and country. */
const IELTS: ShowcaseExam = {
  code: "IELTS",
  name: "International English Language Testing System",
  eyebrow: "IELTS — Academic & General Training",
  tagline: "Four skills, one band. The overall is a mean — your weakest sets it.",
  cards: [
    {
      kind: "benefit",
      label: "Bands 0 to 9",
      body: "Each skill scores 0 to 9 in half bands. Your overall is the mean of the four, not a total.",
    },
    {
      kind: "benefit",
      label: "Rounding works for you",
      body: "An average of 6.25 rounds up to 6.5, and 6.75 rounds up to 7. Quarter-points are worth chasing.",
    },
    {
      kind: "benefit",
      label: "Academic or General",
      body: "Universities want Academic. General Training is for work and migration — Reading and Writing differ.",
    },
    {
      kind: "benefit",
      label: "No negative marking",
      body: "A wrong answer costs nothing. Leaving a Listening or Reading blank is the only guaranteed zero.",
    },
    {
      kind: "benefit",
      label: "A human hears you",
      body: "Speaking is a face-to-face interview with an examiner, 11 to 14 minutes across three parts.",
    },
    {
      kind: "benefit",
      label: "Reading is 40 questions",
      body: "Sixty minutes, three passages, forty questions, no extra transfer time on computer-delivered.",
    },
    {
      kind: "benefit",
      label: "Two years' validity",
      body: "Scores are accepted for two years. Sit it close enough to your intake that it is still live at offer.",
    },
    {
      kind: "tip",
      label: "Task 2 is worth double",
      body: "Task 2 carries twice Task 1's weight. Give it 40 of your 60 minutes — a thin essay caps your band.",
    },
    {
      kind: "tip",
      label: "Word counts are floors",
      body: "150 words for Task 1, 250 for Task 2. Under-length is penalised outright, however good the English.",
    },
    {
      kind: "tip",
      label: "Spelling is scored",
      body: "In Listening and Reading a misspelled right answer is a wrong answer. Copy from the passage exactly.",
    },
    {
      kind: "tip",
      label: "Listening plays once",
      body: "There is no replay. Read the questions in the gaps and let a missed answer go — do not chase it.",
    },
    {
      kind: "tip",
      label: "Part 2 is two minutes",
      body: "The Speaking long turn wants a full two minutes. Practise talking past your instinct to stop at forty seconds.",
    },
    {
      kind: "tip",
      label: "Fluency over vocabulary",
      body: "Examiners score fluency and coherence too. A simple sentence delivered smoothly beats a stalled clever one.",
    },
    {
      kind: "tip",
      label: "Fix the weakest skill",
      body: "The overall is a mean, so a 5.5 Writing drags three 7s down. Spend your time where the band is lowest.",
    },
    {
      kind: "tip",
      label: "Check the retake rules",
      body: "One Skill Retake lets you re-sit a single skill where offered. Confirm your centre supports it first.",
    },
  ],
};

/** TODO(content-review): Focus Edition (2024) — verify sections, timing and the 205-805 scale. */
const GMAT: ShowcaseExam = {
  code: "GMAT",
  name: "Graduate Management Admission Test",
  eyebrow: "GMAT — Graduate Management Admission",
  tagline: "Focus Edition is shorter and sharper. Data Insights counts as much as Quant.",
  cards: [
    {
      kind: "benefit",
      label: "Data Insights, scored",
      body: "Focus Edition's third section carries its own score, weighted equally with Quant and Verbal.",
    },
    {
      kind: "benefit",
      label: "Three sections, 45 each",
      body: "Quant, Verbal and Data Insights, 45 minutes apiece. Around two and a quarter hours in total.",
    },
    {
      kind: "benefit",
      label: "Scored 205 to 805",
      body: "Focus scores end in a 5 — a 705 is not a 700. Old and new scales do not map onto each other.",
    },
    {
      kind: "benefit",
      label: "Edit up to three",
      body: "You may bookmark freely and change up to three answers per section, if you have banked the time.",
    },
    {
      kind: "benefit",
      label: "Choose the order",
      body: "You pick which section to sit first. Lead with your strongest to bank the confidence.",
    },
    {
      kind: "benefit",
      label: "Adaptive by question",
      body: "The test adjusts as you answer, so an early run of errors shapes everything that follows.",
    },
    {
      kind: "benefit",
      label: "Five years, free preview",
      body: "Scores last five years and you see yours before you send it. A bad day need not follow you.",
    },
    {
      kind: "tip",
      label: "No Sentence Correction",
      body: "Focus dropped Sentence Correction and the essay. Verbal is Reading Comprehension and Critical Reasoning now.",
    },
    {
      kind: "tip",
      label: "No geometry",
      body: "Focus removed geometry from Quant. Time spent on circle theorems is time not spent on Data Insights.",
    },
    {
      kind: "tip",
      label: "Do not bank all edits",
      body: "Three edits are a safety net, not a strategy. Flagging ten questions to revisit just burns the clock.",
    },
    {
      kind: "tip",
      label: "The first ten matter",
      body: "Adaptive scoring means early questions steer your difficulty band. Start slow and accurate, not fast.",
    },
    {
      kind: "tip",
      label: "Two-part analysis",
      body: "Data Insights mixes table analysis, graphics and multi-source reasoning. It is not the old IR section.",
    },
    {
      kind: "tip",
      label: "Guess and move",
      body: "There is no penalty beyond the clock, and unanswered questions hurt. Never leave one blank at time.",
    },
    {
      kind: "tip",
      label: "Percentiles shifted",
      body: "Focus percentiles differ from the old exam's. Judge yourself against the new table, not a 2019 chart.",
    },
    {
      kind: "tip",
      label: "Verbal is timing",
      body: "Long RC passages eat Critical Reasoning's minutes. Budget per question type, not per section.",
    },
  ],
};

/** TODO(content-review): GRE was shortened in Sept 2023 — verify duration and section counts. */
const GRE: ShowcaseExam = {
  code: "GRE",
  name: "Graduate Record Examinations",
  eyebrow: "GRE — Graduate Record Examinations",
  tagline: "Under two hours since the 2023 cut. One essay, no unscored section.",
  cards: [
    {
      kind: "benefit",
      label: "Roughly two hours",
      body: "The shortened GRE runs about 1h58m. Half the old exam, and every question you see is scored.",
    },
    {
      kind: "benefit",
      label: "No unscored section",
      body: "The research section is gone. You can no longer be sitting a section that does not count.",
    },
    {
      kind: "benefit",
      label: "One writing task",
      body: "Analyze an Issue survives; Analyze an Argument was cut. Thirty minutes, one essay, scored 0 to 6.",
    },
    {
      kind: "benefit",
      label: "130 to 170 a side",
      body: "Verbal and Quant each score 130 to 170. Most programmes read the two separately, not the sum.",
    },
    {
      kind: "benefit",
      label: "Adaptive by section",
      body: "Your first section's performance sets the second's difficulty — the sections adapt, not the questions.",
    },
    {
      kind: "benefit",
      label: "Calculator provided",
      body: "An on-screen calculator is available throughout Quant. Arithmetic speed matters less than set-up.",
    },
    {
      kind: "benefit",
      label: "Five years, ScoreSelect",
      body: "Scores last five years and ScoreSelect lets you choose which sittings a school ever sees.",
    },
    {
      kind: "tip",
      label: "Vocabulary still rules",
      body: "Text Completion and Sentence Equivalence turn on single words. There is no reasoning around a word you lack.",
    },
    {
      kind: "tip",
      label: "Quant is not hard maths",
      body: "It stops at secondary school. The difficulty is the phrasing and the trap, not the mathematics.",
    },
    {
      kind: "tip",
      label: "Quantitative Comparison",
      body: "The four-choice QC format is unique to the GRE. Learn it cold — it is free marks once the pattern lands.",
    },
    {
      kind: "tip",
      label: "Section one decides",
      body: "Because the exam adapts between sections, a weak first Quant caps the difficulty and your ceiling.",
    },
    {
      kind: "tip",
      label: "No penalty, ever",
      body: "Wrong answers cost nothing. Every blank is a mark forfeited — fill in everything before time.",
    },
    {
      kind: "tip",
      label: "GRE or GMAT",
      body: "Most business schools now take either. Sit whichever suits you; the GRE suits verbal-strong candidates.",
    },
    {
      kind: "tip",
      label: "The essay is formulaic",
      body: "Issue essays reward a clear structure and concrete examples over elegance. Learn one shape and reuse it.",
    },
    {
      kind: "tip",
      label: "Shorter cuts recovery",
      body: "Under two hours there is no slow start. You are at full speed from question one or you are behind.",
    },
  ],
};

/** TODO(content-review): TOEFL iBT was shortened in July 2023 — verify the Writing task change. */
const TOEFL: ShowcaseExam = {
  code: "TOEFL",
  name: "Test of English as a Foreign Language",
  eyebrow: "TOEFL iBT — Internet-Based Test",
  tagline: "Two hours, four skills, 120 marks. Academic English, tested academically.",
  cards: [
    {
      kind: "benefit",
      label: "Under two hours",
      body: "The 2023 cut took TOEFL iBT to about two hours and removed the unscored questions entirely.",
    },
    {
      kind: "benefit",
      label: "Scored out of 120",
      body: "Reading, Listening, Speaking and Writing each score 0 to 30. The total is a sum, not an average.",
    },
    {
      kind: "benefit",
      label: "Academic discussion",
      body: "The independent essay is gone. Writing for an Academic Discussion replaced it — shorter, thread-style.",
    },
    {
      kind: "benefit",
      label: "MyBest scores",
      body: "Many universities accept your best section scores across sittings within two years, combined.",
    },
    {
      kind: "benefit",
      label: "You speak to a machine",
      body: "Speaking is recorded, not interviewed. Four tasks, strict prep and response timers, no interlocutor.",
    },
    {
      kind: "benefit",
      label: "Integrated tasks",
      body: "Speaking and Writing make you read, then listen, then respond. It tests synthesis, not opinion.",
    },
    {
      kind: "benefit",
      label: "Two years' validity",
      body: "Scores expire after two years. Time the sitting so it is still valid when the offer letter lands.",
    },
    {
      kind: "tip",
      label: "Take notes, always",
      body: "Note-taking is permitted throughout and the lectures are long. Nobody scores Listening from memory.",
    },
    {
      kind: "tip",
      label: "Templates work here",
      body: "Integrated tasks have predictable shapes. A rehearsed frame frees your attention for the content.",
    },
    {
      kind: "tip",
      label: "Fill the response time",
      body: "Speaking responses are 45 to 60 seconds. Stopping at 30 leaves marks on the table, however clean it was.",
    },
    {
      kind: "tip",
      label: "Type, do not write",
      body: "Writing is typed under time. If you cannot type fluently in English, that is your bottleneck, not grammar.",
    },
    {
      kind: "tip",
      label: "Academic vocabulary",
      body: "Passages are university-level: geology, art history, biology. Read widely, not just grammar drills.",
    },
    {
      kind: "tip",
      label: "No negative marking",
      body: "Nothing is deducted for a wrong answer. Guess every Reading and Listening question you cannot resolve.",
    },
    {
      kind: "tip",
      label: "Rehearse the headset",
      body: "You will speak aloud in a room of people doing the same. Practise with noise, not in silence.",
    },
    {
      kind: "tip",
      label: "Check the minimum",
      body: "Many programmes set a per-section floor, not just a total. A 100 with a 17 in Speaking can still fail.",
    },
  ],
};

/** TODO(content-review): the SAT went fully digital in 2024 — verify module timings. */
const SAT: ShowcaseExam = {
  code: "SAT",
  name: "Scholastic Assessment Test",
  eyebrow: "SAT — Scholastic Assessment Test",
  tagline: "Digital, adaptive, about two hours. Module one sets module two's ceiling.",
  cards: [
    {
      kind: "benefit",
      label: "Digital and adaptive",
      body: "Sat in Bluebook, roughly 2h14m. Two sections, each two modules — shorter than the paper SAT ever was.",
    },
    {
      kind: "benefit",
      label: "Scored 400 to 1600",
      body: "Reading and Writing scores 200 to 800, Math the same. The total is the sum of the two sections.",
    },
    {
      kind: "benefit",
      label: "Desmos, built in",
      body: "A graphing calculator is embedded and allowed across the whole Math section, not just part of it.",
    },
    {
      kind: "benefit",
      label: "Short passages",
      body: "Reading and Writing now asks one question per short passage. No more long text with a cluster of questions.",
    },
    {
      kind: "benefit",
      label: "No wrong-answer penalty",
      body: "Nothing is deducted for a miss. There is never a reason to leave an SAT question blank.",
    },
    {
      kind: "benefit",
      label: "Faster results",
      body: "Digital scores return in days rather than weeks, which makes an early sitting genuinely repeatable.",
    },
    {
      kind: "benefit",
      label: "Flag and review",
      body: "You can mark questions and return within the module — but never across modules once one closes.",
    },
    {
      kind: "tip",
      label: "Module one sets it",
      body: "Your first module's accuracy decides the second's difficulty. A weak start caps your top achievable score.",
    },
    {
      kind: "tip",
      label: "Learn Desmos first",
      body: "Fluency with the built-in graphing calculator is worth real marks. Do not meet it on test day.",
    },
    {
      kind: "tip",
      label: "Practise in Bluebook",
      body: "The official app is the exam. Paper practice rehearses reading and maths, but not the test you sit.",
    },
    {
      kind: "tip",
      label: "Grammar is rules",
      body: "The Writing questions test a finite rule set: commas, agreement, transitions. That is learnable.",
    },
    {
      kind: "tip",
      label: "Bring your own device",
      body: "Most candidates test on their own laptop or tablet. Charge it, update Bluebook, and check it in advance.",
    },
    {
      kind: "tip",
      label: "Answer everything",
      body: "With no penalty and a hard module close, an unanswered question is a mark you simply chose not to take.",
    },
    {
      kind: "tip",
      label: "Timing per module",
      body: "Each module is its own clock. Banking time in module one does not buy you a second in module two.",
    },
    {
      kind: "tip",
      label: "Superscore policies vary",
      body: "Some universities combine your best sections across dates; others do not. Check before you re-sit.",
    },
  ],
};

/**
 * Order is the rotation order. dMAT leads because it is the exam we actually
 * run, and it is where reduced-motion parks.
 */
export const EXAM_SHOWCASE: readonly ShowcaseExam[] = [
  DMAT,
  CAT,
  JEE,
  IELTS,
  GMAT,
  GRE,
  TOEFL,
  SAT,
];
