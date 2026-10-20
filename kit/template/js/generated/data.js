// Sample course so the template is a complete site before a config overwrites it.
// scaffold.mjs replaces this file.

export const DATA = {
  site: {
    title: "Study map",
    course: "Sample",
    tagline: "One object, two readings.",
    description: "An interactive study map.",
    throughline: "One object can be read two ways. Every stop asks you to watch that object and name the reading that makes the question obvious.",
    storagePrefix: "study:",
    footer: "A study map. It runs in your browser and works offline.",
    footerByMap: {},
    ledeByMap: {},
    textbook: {
      title: "Sample notes",
      authors: [],
      edition: "",
      url: "",
      licence: "Sample text written for the starter. Replace it with the course textbook.",
      note: "Not a published book. The scaffold overwrites this from the config."
    }
  },
  maps: [{ id: "main", title: "The course", note: "A sample map" }],
  parts: {
    I: { title: "The idea", note: "Start here" },
    V: { title: "Practice", note: "Cards and problems" }
  },
  threads: [
    { id: "A", title: "Where it sits", summary: "One reading of the object.", tone: "cart", mark: "disc", maps: ["main"] },
    { id: "B", title: "How to reach it", summary: "The other reading of the same object.", tone: "polar", mark: "ring", maps: ["main"] }
  ],
  colourKeys: {
    main: [
      { role: "cart", text: "Blue is the first reading." },
      { role: "polar", text: "Orange is the second reading of the same object." },
      { role: "input", text: "Green is the thing you drag." }
    ]
  },
  chapters: [{ id: "1", title: "The idea" }],
  stations: [
    {
      id: "home", title: "The Map", kind: "map", module: "./stations/home.js",
      map: "shared", part: "I", order: 0, threads: ["A", "B"], topics: [], problems: [],
      summary: "The two readings, and every stop.",
      observe: "Follow one thread before you jump.",
      source: { chapter: 1, section: "1", sectionTitle: "The idea" }
    },
    {
      id: "point", title: "One point, two readings", kind: "viz", visualization: "two-addresses",
      module: "./stations/addresses.js", map: "main", part: "I", order: 1,
      threads: ["A", "B"], topics: ["S1"], problems: ["1.1"],
      summary: "Drag one point. Both readings update.",
      observe: "Watch the blue drops and the orange ray name the same dot.",
      source: { chapter: 1, section: "1.1", sectionTitle: "Two readings", exercise: "1.1" },
      viz: {
        start: { re: 1, im: 1 },
        sentence: "The first reading says where it sits. The second says how to reach it.",
        presets: [
          { id: "one", label: "1 + i", re: 1, im: 1 },
          { id: "neg", label: "−1", re: -1, im: 0 }
        ]
      }
    },
    {
      id: "cards", title: "Flashcards", kind: "flashcards", module: "./stations/deck.js",
      map: "main", part: "V", order: 2, threads: ["A"], topics: [], problems: [],
      summary: "Say the back before you show it.",
      observe: "The front is a question. The back is the short answer.",
      source: { chapter: 1, section: "1", sectionTitle: "The idea" }
    },
    {
      id: "practice", title: "Practice", kind: "practice", module: "./stations/practice.js",
      map: "main", part: "V", order: 3, threads: ["A", "B"], topics: [], problems: ["1.1"],
      summary: "A question, a hint, then the answer.",
      observe: "Try the hint before the answer.",
      source: { chapter: 1, section: "1.1", sectionTitle: "Two readings", exercise: "1.1" }
    }
  ],
  concepts: [
    {
      id: "S1", title: "Two readings", station: "point",
      summary: "The same point has two names.",
      source: { chapter: 1, section: "1.1", sectionTitle: "Two readings" }
    }
  ],
  flashcards: [
    {
      id: "fc-1",
      front: "What do the two readings of one point say?",
      back: "One says where it sits. The other says how to reach it.",
      station: "point",
      threads: ["A", "B"],
      source: { chapter: 1, section: "1.1", sectionTitle: "Two readings" }
    }
  ],
  problems: [
    {
      id: "1.1",
      chapter: 1,
      statement: "A point sits at $1+i$. Give both readings.",
      hint: "Across 1 and up 1 is the first reading. The length is $\\sqrt{2}$ and the angle is a quarter turn.",
      answer: {
        tex: "Cartesian $1+i$. Polar $\\sqrt{2}$ at angle $\\pi/4$.",
        text: "1+i, and length sqrt(2) at pi/4",
        values: { re: 1, im: 1, r: 1.41421356237, arg: 0.785398163397 }
      },
      station: "point",
      threads: ["A"],
      source: { chapter: 1, section: "1.1", sectionTitle: "Two readings", exercise: "1.1" }
    }
  ]
};
