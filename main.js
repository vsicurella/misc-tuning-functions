let frequencyToMts = (f) => 69 + Math.log2(f / 440) * 12;

let lowestMtsFrequency = 440 * Math.pow(2, -69/12.0);
let highestMtsFrequency = 440 * Math.pow(2, (127-69)/12)

let ratioToCents = (ratio) => Math.log2(ratio) * 1200.0;
let centsToRatio = (cents) => Math.pow(2, cents / 1200.0);

let etFrequencyTable = (divisions, centsPeriod, rootFreq) =>
{
    let periodRatio = centsToRatio(centsPeriod);
    let root = Math.round(divisions * Math.log2(rootFreq / lowestMtsFrequency) / Math.log2(periodRatio));
    let size = Math.round(divisions * Math.log2(highestMtsFrequency /rootFreq) / Math.log2(periodRatio) + root) + 1;
    return Array.from(new Array(size))
                .map((x, i) => rootFreq * Math.pow(periodRatio, (i - root)/divisions))
};

let edoFrequencyTable = (divisions, rootFreq) => etFrequencyTable(divisions, 1200, rootFreq);

let roundN = (n, num) =>  Math.round(num * Math.pow(10, n)) / Math.pow(10, n);

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

let midiChNoteToIndex = (channel, note) => (channel - 1) * 128 + note;

let periodicMapping = (period, rootMidiIndex, tuningRootIndex, tuningSize) => 
{
    let startPeriod = Math.floor(-rootMidiIndex / 128);
    return Array.from(new Array(16))
                .map((x, ch) => Array.from(new Array(128))
                                     .map((x,n) => (startPeriod * period + period * ch + tuningRootIndex + n) % tuningSize)
                );


}

let linearMapping = (mapRootIndex, tuningRootIndex, tuningTableSize) => Array.from(new Array(16))
                                                                             .map((x,ch) => Array.from(new Array(128))
                                                                                                 .map((y,note)=> mod(ch*128-mapRootIndex+tuningRootIndex+note, tuningTableSize)))
                              
let pitchbend = (semitones, range) => Math.round((semitones/range) * 16384 + 8192)
