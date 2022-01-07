let frequencyToMts = (f) => 69 + Math.log2(f / 440) * 12;

let lowestMtsFrequency = 440 * Math.pow(2, -69/12.0);
let highestMtsFrequency = 440 * Math.pow(2, (127-69)/12)

let ratioToCents = (ratio) => Math.log2(ratio) * 1200.0;
let centsToRatio = (cents) => Math.pow(2, cents / 1200.0);

/*
    mtsRootFrequencyAndTableSize

    divisions:      number of steps to divide centsPeriod by
    centsPeriod:    period of the scale in cents
    rootFreq:       a frequency to align the table with

    returns:    the root index and tuning table size that describes a tuning
                table with the given parameters

    NOTE:   this should not use Math.round() which allows a note below or above the MTS bounds. 
            I am not testing for that in Everytone Tuner at the moment, which is why it's left in.
            Eventually I'll get around to updating my tests to be within MTS and fix it here.

    I believe it should be:
    let root = Math.ceil(divisions * Math.log2(rootFreq / lowestMtsFrequency) / Math.log2(periodRatio));
    let size = Math.floor(divisions * Math.log2(highestMtsFrequency /rootFreq) / Math.log2(periodRatio) + root) + 1;    
*/
let mtsRootFrequencyAndTableSize = (divisions, centsPeriod, rootFreq) =>
{
    let periodRatio = centsToRatio(centsPeriod);
    let root = Math.round(divisions * Math.log2(rootFreq / lowestMtsFrequency) / Math.log2(periodRatio));
    let size = Math.round(divisions * Math.log2(highestMtsFrequency / rootFreq) / Math.log2(periodRatio) + root) + 1;
    
    return [root, size];
}

/*
    etFrequencyTable

    divisions:      number of steps to divide centsPeriod by
    centsPeriod:    period of the scale in cents
    rootFreq:       a frequency to align the table with

    returns:    an array of frequencies that span from the closest lowest MTS value
                to the closest highest MTS value* given by the alignment of the root frequency   

    * see NOTE in mtsRootFrequencyAndTableSize description
*/
let etFrequencyTable = (divisions, centsPeriod, rootFreq) =>
{
    let periodRatio = centsToRatio(centsPeriod);
    let [root, size] = mtsRootFrequencyAndTableSize(divisions, centsPeriod, rootFreq);
    return Array.from(new Array(size))
                .map((x, i) => rootFreq * Math.pow(periodRatio, (i - root)/divisions))
};

/*
    edoFrequencyTable

    divisions:  number of steps to divide the octave by
    rootFreq:   a frequency to align the table with

    returns:    an array of frequencies that span from the closest lowest MTS value
                to the closest highest MTS value* given by the alignment of the root frequency   

    * see NOTE in mtsRootFrequencyAndTableSize description
*/
let edoFrequencyTable = (divisions, rootFreq) => etFrequencyTable(divisions, 1200, rootFreq);

let roundN = (places, value) =>  Math.round(value * Math.pow(10, places)) * Math.pow(10, -places);

let findClosestIndex = (value, arr) => 
{ 
    let D = 10e10; 
    let ci = 0; 
    for (var i = 0; i < arr.length; i++) 
    { 
        let d = Math.abs(value - arr[i]); 
        if (d < D) 
        { 
            D = d; 
            ci = i; 
        } 
    }; 
    
    return ci 
};

/*
    channel: MIDI channel from 1 through 16
    note: MIDI note from 0 through 127

    returns: absolute an index that factors in both channel & note, from 0 through 2047
*/
let midiChNoteToIndex = (channel, note) => (channel - 1) * 128 + note;

/*
    periodicMapping

    stepsPeriod:        the mapping period of the scale, or how many steps there are to the centsPeriod
    rootMidiChannel:    MIDI channel from 1 through 16, aligns with tuningRootIndex
    rootMidiNote:       MIDI note from 0 through 127, aligns with tuningRootIndex
    tuningRootIndex:    the tuning table index that gives the root frequency
    tuningTableSize:    the size of the tuning table

    returns:    a 2D array corresponding to [midiChannelIndex][midiNote] = tuningIndex
                where keeping the same MIDI note but jumping a channel results in a displacement 
                of one stepsPeriod.
                wraps around when it exceeds the tuningTableSize
*/
let periodicMapping = (stepsPeriod, rootMidiChannel, rootMidiNote, tuningRootIndex, tuningTableSize) => 
{
    let startPeriod = -(rootMidiChannel - 1);
    return Array.from(new Array(16))
                .map((x, ch) => Array.from(new Array(128))
                                     .map((x,n) => (startPeriod * stepsPeriod + stepsPeriod * ch + tuningRootIndex - rootMidiNote + n) % tuningTableSize)
                    );
}


/*
    linearMapping

    midiRootIndex:      an absolute index from 0 through 2047 representing a (midiChannelIndex, midiNote) pair
    tuningRootIndex:    the tuning table index that gives the root frequency
    tuningTableSize:    the size of the tuning table

    returns:    a 2D array corresponding to [midiChannelIndex][midiNote] = tuningIndex
                that is rooted on the midiRootIndex and mapped linearly, but wrapping
                when the tuningIndex exceeds the tuningTableSize 

*/
let linearMapping = (midiRootIndex, tuningRootIndex, tuningTableSize) => Array.from(new Array(16))
                                                                             .map((x,ch) => Array.from(new Array(128))
                                                                                                 .map((y,note)=> mod(ch*128-midiRootIndex+tuningRootIndex+note, tuningTableSize)))

/*
    pitchbend

    semitones:  the relative amount of semitones to bend a note by
    range:      the bipolar pitchbend range to cover 0 through 16383,
                for example, a pitchbend range of 4 will map 0 through 8192 to -2 semitones
                and 8192 through 16384 to +2 semitones, where 8192 is no change.

    returns     an unbounded pitchbend value - only 0 through 16383 is valid
*/
let pitchbend = (semitones, range) => Math.round((semitones / range) * 16384 + 8192)
