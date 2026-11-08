# Data licenses

The MIT license in [LICENSE](LICENSE) covers the app's code. It does not cover the data files below, which are built from other people's work and keep their licenses.

## People data: CC BY-SA 4.0

Files:

- `src/data/figures.json`
- `src/data/figure-aliases.json`
- `reference/people-report.json`

These files are adapted from four open datasets:

| Source | Creator | License |
|---|---|---|
| [TIPNR](https://github.com/STEPBible/STEPBible-Data) (Translators Individualised Proper Names with all References) | STEPBible.org, based on work at Tyndale House, Cambridge | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| [BibleData](https://github.com/BradyStephenson/bible-data) | Brady Stephenson and contributors | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| [Theographic Bible Metadata](https://github.com/robertrouse/theographic-bible-metadata) | Robert Rouse | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| [ACAI](https://github.com/BibleAquifer/ACAI) | Mission Mutual | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |

Theographic and ACAI are share-alike, so these files are shared under the [Creative Commons Attribution-ShareAlike 4.0 International License](https://creativecommons.org/licenses/by-sa/4.0/). You may copy, change and share them, including commercially. If you do, credit the sources above, say what you changed, and share your changed version under the same license.

What was changed:

- Records for the same person were matched across the four datasets.
- Every family claim was tested against the Hebrew and Greek text, tagged word by word. Claims Scripture states were kept with their verse. Claims it contradicts were dropped. Claims it doesn't address were kept only with support from the sources, and marked. `reference/people-report.json` lists each decision.
- People a source inferred but the verses don't mention were removed, and duplicates were joined. BibleData's "Talitha" is Jairus's unnamed daughter, since Mark 5:41 translates the word as "little girl".
- TIPNR files every "Israel" and "Judah" under the founder. Jacob, his twelve sons, Ephraim and Manasseh keep the verses of their own story, and elsewhere only those that name them as people.
- A reign is given only to the king a verse says "became king", not to another king it dates by.
- Sentences in TIPNR's summaries that gave someone a family the verses don't support were removed.
- Calendar dates follow Theographic's chronology, with a lifespan corrected where a verse gives a different number of years.

The sources are provided as is, without warranties. See each license for details.

## Bible texts

`assets/bible` holds four translations from [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases): the Berean Standard Bible (CC0), the New Heart English Bible (public domain), the King James Version (public domain, except in the UK, where Crown rights apply) and the American Standard Version of 1901 (public domain).

This is a summary, not legal advice. Check the license terms before a public release, especially if the app will ever charge money.
