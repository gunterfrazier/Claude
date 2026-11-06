// The BibliaTree dataset. It's generated, so don't edit figures.json by hand: change the sources or rules in
// scripts/build_people.py in the Veritas Logos project, then run scripts/export_people.py and `npm run data:check`.
// Every family claim was tested against the tagged Hebrew and Greek, and the Bible decides. See reference/people-report.json.
// Scripture text is not stored here: verses come from the bundled translations in assets/bible.
import data from "./figures.json";
import type { Figure } from "./types";

export const FIGURES = data as unknown as Figure[];
