// The lick library. All licks are original practice material.
// root = pitch class (C=0 ... A=9, B=11). position = fret window of the scale box shown.
// instrument / tuning = ids from INSTRUMENTS in ../shared/theory.js (default 'guitar' / 'standard').
// See notation.js for the tab notation. scale = a key of SCALES in ../shared/theory.js.

export const LICKS = [
  // ---------------------------------------------------------------- Foundation
  {
    id: 'am-box1',
    title: 'A Minor Pentatonic: Box 1',
    style: 'Foundation',
    level: 1,
    root: 9, scale: 'minor-pentatonic', position: [5, 8], bpm: 90,
    tab: `6-5:e 6-8 5-5 5-7 4-5 4-7 3-5 3-7 | 2-5 2-8 1-5 1-8 1-5 2-8 2-5 3-7 |
          3-5 4-7 4-5 5-7 5-5 6-8 6-5:q`,
    about: 'The most-used shape in rock and blues guitar. Two notes per string, up and back down. Most of the other licks here live in or around this box.',
    theory: 'The orange dots are A, the "home" note (root). The scale has 5 notes: A C D E G. Switch the fretboard to "Intervals" and you will see them as R ♭3 4 5 ♭7. Those numbers are the same in every key, so learning them is how the dots start to connect.',
    practice: 'Index finger on the 5th fret, ring finger on the 7th, pinky on the 8th. Alternate pick (down-up). Keep it slow and even with the click on, then try "Whole neck" to see where this box sits among the others.',
  },
  {
    id: 'am-in-threes',
    title: 'Pentatonic in 3s',
    style: 'Foundation',
    level: 2,
    root: 9, scale: 'minor-pentatonic', position: [5, 8], bpm: 70,
    tab: `6-5:t 6-8 5-5 6-8 5-5 5-7 5-5 5-7 4-5 5-7 4-5 4-7 |
          4-5 4-7 3-5 4-7 3-5 3-7 3-5 3-7 2-5 3-7 2-5 2-8 |
          2-5:q 1-5:h~ r:q`,
    about: 'Box 1 played in overlapping groups of three: notes 1-2-3, then 2-3-4, then 3-4-5 and so on. A sequence like this turns a scale into something that sounds like music.',
    theory: 'Running a scale straight up and down sounds like an exercise. Sequences (patterns of 3s or 4s) are how players move through a scale while sounding melodic. Grab any 3-note chunk of this and you have a lick.',
    practice: 'Count "1-trip-let 2-trip-let", one note per syllable. Start at 60% and use the speed trainer. Watch the teal ring on the fretboard: it always shows where the next note is.',
  },

  // ---------------------------------------------------------------- Blues
  {
    id: 'blues-bend',
    title: 'The Blues Bend',
    style: 'Blues',
    level: 1,
    root: 9, scale: 'minor-pentatonic', position: [5, 8], bpm: 80, swing: true,
    tab: `2-8b2:q 1-5:e 2-8 2-5:q 3-7:e 3-5 | 4-7:h~ r:h`,
    about: 'A classic phrase: bend, hit the root, then walk down the box and land on A with vibrato.',
    theory: 'The B string 8th fret is G. Bending it up a whole step (2 frets) turns it into A, the root. Bending into the root is one of the most "vocal" moves on guitar. It sounds like a singer reaching for a note.',
    practice: 'Bend with your ring finger and put your middle and index fingers behind it on the same string to help push. Play 2-10 first to hear the target note, then bend 2-8 until it matches.',
  },
  {
    id: 'blues-grace-hammer',
    title: 'Minor-to-Major Grace Hammer',
    style: 'Blues',
    level: 1,
    root: 9, scale: 'blues', position: [5, 8], bpm: 84, swing: true,
    tab: `3-5:g h3-6:q 2-5:e 3-6 3-5 4-7:q~ r:e |
          3-5:g h3-6:q 2-5:e 1-5 2-5 3-6 3-5 4-7`,
    about: 'A quick hammer-on from C to C# (the minor 3rd to the major 3rd), then down to the root. You hear it in almost every blues solo.',
    theory: 'The C is the minor 3rd from A minor pentatonic; C# is the major 3rd of the A chord. Flicking from one to the other in a split second is the sound of blues: it sits between minor and major. The small 5 in the tab is a grace note: pick it and hammer on almost at once, so the C# gets the beat.',
    practice: 'Index finger on the G string 5th fret, middle finger hammers the 6th fret. Pick and hammer nearly together: it should sound like one slightly smeared note, not two. Then try slowing the speed: the grace note stays quick, only the beat slows down.',
  },
  {
    id: 'double-stops',
    title: "Rock 'n' Roll Double-Stops",
    style: 'Blues',
    level: 2,
    root: 9, scale: 'minor-pentatonic', position: [5, 8], bpm: 132, swing: true,
    tab: `2-8+1-8:e 2-8+1-8 2-8+1-8 2-8+1-8 2-8+1-8 2-8+1-8 2-8+1-8 2-8+1-8 |
          2-5+1-5 2-5+1-5 2-5+1-5 2-5+1-5 2-5+1-5 2-5+1-5 3-7 3-5 | 4-7:h~ r:h`,
    about: 'Two strings struck together, hammered out in a driving shuffle. Think 1950s rock and roll.',
    theory: 'A "double-stop" is just two notes played at once. Here the top two strings at fret 8 are G and C, then at fret 5 they are E and A. Both pairs come from the A minor pentatonic box you already know, just played two at a time.',
    practice: 'Barre the two strings with one finger (ring finger on 8, index on 5). Use short down-strokes and mute the other strings with your picking hand palm.',
  },
  {
    id: 'blues-scale-run',
    title: 'Blue Note Run',
    style: 'Blues',
    level: 2,
    root: 9, scale: 'blues', position: [5, 8], bpm: 72,
    tab: `1-8:t 1-5 2-8 2-5 3-8 3-7 3-5 4-7 4-5 5-7 5-6 5-5 | 6-8:q 6-5:h~ r:q`,
    about: 'A fast descending triplet run through the blues scale, ending on the low root.',
    theory: 'The blues scale is the minor pentatonic plus one extra note: the ♭5 (here D#, on G string 8th fret and A string 6th fret). It is a "passing" note: it sounds tense if you stop on it, but great when you slide through it.',
    practice: 'Use your middle finger for the 6th-fret notes. Practise the four notes 5-7 5-6 5-5 6-8 on their own first. That chromatic slide is the bit that gives the run its flavour.',
  },
  {
    id: 'boogie',
    title: 'Boogie Shuffle Riff',
    style: 'Blues',
    level: 1,
    root: 9, scale: 'mixolydian', position: [0, 5], bpm: 110, swing: true,
    tab: `5-0+4-2:e 5-0+4-2 5-0+4-4 5-0+4-4 5-0+4-5 5-0+4-5 5-0+4-4 5-0+4-4 |
          4-0+3-2 4-0+3-2 4-0+3-4 4-0+3-4 4-0+3-5 4-0+3-5 4-0+3-4 4-0+3-4 |
          5-0+4-2 5-0+4-2 5-0+4-4 5-0+4-4 5-0+4-5 5-0+4-5 5-0+4-4 5-0+4-4 |
          6-0+5-2 6-0+5-2 6-0+5-4 6-0+5-4 6-0+5-5 6-0+5-5 6-0+5-4 6-0+5-4`,
    about: 'The rhythm part behind a thousand blues songs. The same 2-string shape moves across A, D and E.',
    theory: 'Open string + 2nd fret = a power chord (root and 5th). Reaching up 2 frets adds the 6th, and 3 frets adds the ♭7. Those are the chord tones of a "dominant 7" chord, the sound of the blues. A, D and E are chords I, IV and V in the key of A.',
    practice: 'Index on fret 2, ring on 4, pinky on 5. Feel the swing: long-short, long-short ("dah-da dah-da"). Then play it 3 times on A, once on D, back to A, then E for a full 12-bar blues.',
  },

  // ---------------------------------------------------------------- Rock
  {
    id: 'triplet-cascade',
    title: 'Triplet Cascade',
    style: 'Rock',
    level: 2,
    root: 9, scale: 'minor-pentatonic', position: [5, 8], bpm: 90,
    tab: `1-8:t p1-5 2-8 1-8 p1-5 2-8 2-8 p2-5 3-7 2-8 p2-5 3-7 |
          3-7 p3-5 4-7 3-7 p3-5 4-7 4-7:h~`,
    about: 'A repeating 3-note pull-off pattern that steps down the box one string at a time. Sounds fast, but it is the same tiny shape over and over.',
    theory: 'Each 3-note group is just two adjacent strings of box 1. Repeating a small cell and moving it is a core rock-solo trick. Your fingers learn one shape, and the audience hears a flurry.',
    practice: 'Pick the first note, pull off for the second (flick the string as you lift), pick the third. Get each group clean on its own before chaining them.',
  },
  {
    id: 'power-chord-riff',
    title: 'Power Chord Riff',
    style: 'Rock',
    level: 1,
    root: 4, scale: 'minor-pentatonic', position: [0, 7], bpm: 112,
    tab: `6-0+5-2:e 6-0+5-2 6-3+5-5:q 6-0+5-2:e 6-0+5-2 6-5+5-7:q |
          6-0+5-2:e 6-0+5-2 6-3+5-5:e 6-5+5-7 r 6-5+5-7 6-3+5-5:q`,
    about: 'A chunky riff using three power chords: E5, G5 and A5.',
    theory: 'A power chord is a root plus the note 7 frets higher (the 5th). It has no major or minor sound, which is why it works with distortion. The roots E, G and A all come from E minor pentatonic, which is why the riff sounds "right".',
    practice: 'Index on the low E string, ring finger two frets up on the A string, and slide the shape. Rest your picking-hand palm lightly on the strings near the bridge for a tighter, chuggier sound.',
  },
  {
    id: 'drop-d-chug',
    title: 'Drop D Chug',
    style: 'Rock',
    level: 1,
    root: 2, scale: 'minor-pentatonic', position: [0, 5], bpm: 120, tuning: 'dropD',
    tab: `6-0:e 6-0 6-0+5-0+4-0:q 6-0:e 6-0 6-3+5-3+4-3:e 6-5+5-5+4-5 |
          6-0:e 6-0 6-0+5-0+4-0:q 6-0:e 6-3+5-3+4-3 6-0+5-0+4-0:q`,
    about: 'A heavy riff in drop D: chugging on the open low string, then one-finger power chords on F and G.',
    theory: 'Tune the low E down to D and the bottom three strings at the same fret give root, 5th and octave: a power chord under one finger. D, F and G are all from D minor pentatonic, which is why it sounds heavy but "right".',
    practice: 'Tune the low string down until it matches the open D string an octave lower. Barre the bottom three strings with your index finger and mute the rest with the side of it. Palm-mute the single open-string chugs.',
  },
  {
    id: 'em-open-riff',
    title: 'Open E Blues Riff',
    style: 'Rock',
    level: 1,
    root: 4, scale: 'blues', position: [0, 3], bpm: 100,
    tab: `6-0:e 6-0 6-3:q 6-0:e 5-0 5-2:q | 6-0:e 6-0 6-3 6-0 5-0 5-1 5-2:q`,
    about: 'A simple single-note riff on the low strings using open strings. A great first riff.',
    theory: 'E minor pentatonic in open position uses lots of open strings, so it is the easiest key for riffs. The 5-1 note (A#) is the blues "♭5". The 0-1-2 creep on the A string is pure blues grit.',
    practice: 'Let the open E ring as a "drone". Use index for fret 1, middle for fret 2, ring for fret 3. Lock in with the click: this is about groove, not speed.',
  },
  {
    id: 'slide-box2',
    title: 'Sliding Into Box 2',
    style: 'Rock',
    level: 2,
    root: 9, scale: 'minor-pentatonic', position: [5, 10], bpm: 84,
    tab: `4-5:e 4-7 3-5 3-7 /3-9:q 2-8:e 2-10 | 1-8 1-10b2:q 1-8:e 2-10 2-8 3-9 /3-7 | 4-7:h~ r:h`,
    about: 'Starts in box 1, slides up the G string into box 2, plays a bend up there and slides back home.',
    theory: 'This is "connecting the dots". Box 1 and box 2 share notes, and a slide is the bridge between them. Switch the fretboard to "Whole neck" and you will see the five boxes overlap like a chain across the neck.',
    practice: 'Slide with your ring finger from 7 to 9 on the G string, keeping pressure so the note keeps sounding. The bend at 1-10 (D up to E) is done with the ring finger, supported by the middle finger.',
  },

  // ---------------------------------------------------------------- Country / Major
  {
    id: 'major-pent-country',
    title: 'Major Pentatonic Country Lick',
    style: 'Country',
    level: 2,
    root: 9, scale: 'major-pentatonic', position: [2, 5], bpm: 100,
    tab: `5-4:e 4-2:g h4-4:q 3-2:g h3-4:q 2-2:e 2-5 1-2 | 1-5:q 2-5:g p2-2:q 3-4:g p3-2:q 4-4:q | 4-2:q 5-4 6-5:h`,
    about: 'A bright, happy run up and down the A major pentatonic, with hammer-ons going up and pull-offs coming down.',
    theory: 'Big secret: this is the exact same shape as box 1, just moved down 3 frets. Box 1 at fret 5 is A minor, and the same shape at fret 2 is A major. Same five shapes, different "home" note. Use "Intervals" to see that the root has moved.',
    practice: 'Play the A minor box 1 lick, then this one, back to back. Hear the change from sad to happy. The small numbers in the tab are grace notes: pick them and hammer or pull off almost immediately, so the note you land on gets the beat.',
  },

  {
    id: 'aeolian-melody',
    title: 'Natural Minor Melody',
    style: 'Melody',
    level: 1,
    root: 9, scale: 'natural-minor', position: [4, 8], bpm: 76,
    tab: `1-8:q 1-7:e 1-5 2-6:q 2-5 | 3-7:q 3-5:e 3-4 4-7:h~`,
    about: 'A slow, singing melody that steps down the A natural minor scale.',
    theory: 'Add two notes to the minor pentatonic, B (the 2) and F (the ♭6), and you get the full natural minor scale. Those extra notes fill the gaps, so melodies can move in small steps. That makes this sound more like a song than a blues lick.',
    practice: 'Play it slowly with vibrato on the last note. Then try to make up your own 2-bar melody using only the dots shown on the fretboard.',
  },

  // ---------------------------------------------------------------- Technique
  {
    id: 'legato-workout',
    title: 'Hammer-On / Pull-Off Workout',
    style: 'Technique',
    level: 1,
    root: 9, scale: 'minor-pentatonic', position: [5, 8], bpm: 80,
    tab: `6-5:e h6-8 5-5 h5-7 4-5 h4-7 3-5 h3-7 | 2-5 h2-8 1-5 h1-8 1-8 p1-5 2-8 p2-5 |
          3-7 p3-5 4-7 p4-5 5-7 p5-5 6-8 p6-5`,
    about: 'Box 1, but you only pick the first note on each string. The second note is made with your fretting hand. The timing is deliberately even: every note gets the same length.',
    theory: 'Hammer-ons (h) and pull-offs (p) are called "legato": smooth, connected notes. They are how players sound fast and fluid without picking every note. In real playing they are often quick flicks (see the Grace-Note Flicks drill); this drill keeps them even because evenness is the hard part: most people rush the hammered note or play it quieter.',
    practice: 'Hammer-on: bring the finger down hard and fast like a little hammer. Pull-off: pull the finger slightly sideways as you lift, so it plucks the string. Use the click and aim for every note to be the same length and the same volume.',
  },

  // ---------------------------------------------------------------- Bass
  {
    id: 'bass-walk',
    title: 'Walking Blues Bass',
    style: 'Bass',
    level: 1,
    instrument: 'bass',
    root: 9, scale: 'mixolydian', position: [0, 5], bpm: 100, swing: true,
    tab: `3-0:e 3-4 2-2 2-4 2-5 2-4 2-2 3-4 | 2-0 2-4 1-2 1-4 1-5 1-4 1-2 2-4 |
          3-0 3-4 2-2 2-4 2-5 2-4 2-2 3-4 | 4-0 4-4 3-2 3-4 3-5 3-4 3-2 4-4`,
    about: 'The classic walking bass line under a blues in A: up the chord and back down, moved to D and E.',
    theory: 'Each bar walks root, 3rd, 5th, 6th, ♭7 and back down: the notes of a dominant 7 chord plus the 6th. Moving the same shape to D and E gives the I, IV and V chords of a blues. It is the boogie guitar riff, an octave lower and one note at a time.',
    practice: 'Use one finger per fret: index on 2, middle on 3 (unused here), ring on 4, pinky on 5. Pluck with alternating index and middle fingers and keep the swing even. Mute the open strings you are not playing with your fretting hand.',
  },

  // ---------------------------------------------------------------- Ukulele
  {
    id: 'uke-four-chords',
    title: 'Four-Chord Uke Strum',
    style: 'Ukulele',
    level: 1,
    instrument: 'ukulele',
    root: 0, scale: 'major', position: [0, 3], bpm: 96,
    tab: `4-0+3-0+2-0+1-3:q 4-0+3-0+2-0+1-3:e 4-0+3-0+2-0+1-3 4-0+3-0+2-0+1-3:q 4-0+3-0+2-0+1-3:e 4-0+3-0+2-0+1-3 |
          4-2+3-0+2-0+1-0:q 4-2+3-0+2-0+1-0:e 4-2+3-0+2-0+1-0 4-2+3-0+2-0+1-0:q 4-2+3-0+2-0+1-0:e 4-2+3-0+2-0+1-0 |
          4-2+3-0+2-1+1-0:q 4-2+3-0+2-1+1-0:e 4-2+3-0+2-1+1-0 4-2+3-0+2-1+1-0:q 4-2+3-0+2-1+1-0:e 4-2+3-0+2-1+1-0 |
          4-0+3-2+2-3+1-2:q 4-0+3-2+2-3+1-2:e 4-0+3-2+2-3+1-2 4-0+3-2+2-3+1-2:q 4-0+3-2+2-3+1-2:e 4-0+3-2+2-3+1-2`,
    about: 'C, Am, F, G: the four chords behind hundreds of pop songs, with a down, down-up, down, down-up strum.',
    theory: 'These are chords I, vi, IV and V in the key of C. Standard ukulele tuning is "re-entrant": the G string (bottom line of the tab) is tuned high, above the C string next to it, so open chords sound bright and close together.',
    practice: 'Strum with the nail of your index finger: down on the beat, up on the "&". Change chord on beat 1 and keep the strumming hand moving even when you miss a chord. C and Am share fingers on the G and A strings, so that change is the easiest; practise F to G on its own.',
  },
  {
    id: 'grace-flicks',
    title: 'Grace-Note Flicks',
    style: 'Technique',
    level: 1,
    root: 9, scale: 'minor-pentatonic', position: [5, 8], bpm: 80,
    tab: `6-5:g h6-8:q 5-5:g h5-7:q 4-5:g h4-7:q 3-5:g h3-7:q |
          2-5:g h2-8:q 1-5:g h1-8:q 1-8:g p1-5:q 2-8:g p2-5:q |
          3-7:g p3-5:q 4-7:g p4-5:q 5-7:g p5-5:q 6-8:g p6-5:q`,
    about: 'The same notes as the Hammer-On / Pull-Off Workout, played the way hammer-ons usually turn up in songs: a quick flick into a note that lands on the beat.',
    theory: 'The small numbers are grace notes. They take no time of their own: you pick, and the hammer-on or pull-off follows almost instantly, so the note you land on gets the beat. This is the snappy, ornamental legato of blues and country, as opposed to the even legato of the workout.',
    practice: 'Pick and hammer (or pull off) so close together they almost sound like one note with a "blip" at the start. Keep the landing notes exactly on the click. Then switch back to the even workout and feel the difference.',
  },
];
