const passAPI = 'ZtX3pYBsYvWgjPvEw9k3GKUmLFSaSs2RQujhziCU'

let responseSounds, rChoosenSound, sounds, choosenSound, finalSound, soundIndex, maxSoundIdx, player

let playLoop

const recorder = new Tone.Recorder();

// ---------- PARAMETERS' DEFAULT VALUES -------------//

const defaultValues = {
    addFreq: 0,
    envAttack: 0.1,
    envDecay: 0.1,
    envSus: 1,
    envRelease: 0.1,
    gain: 1,
    tremLFO: 0,
    tremDepth: 1,
    lpf: 20000,
    hpf: 0,
    bpm: 30,
    pbRate: 1
}

let pbRate = defaultValues.pbRate

let beatStage = {
    one: 1,
    two: 1,
    three: 1,
    four: 1
}


// ---------- DOM VARIABLES -------------//

const searchBtn = document.getElementById('searchBtn')
const playBtn = document.getElementById('playBtn')
const stopBtn = document.getElementById('stopBtn')
const nextSound = document.getElementById('nextSound')
const prevSound = document.getElementById('prevSound')

const pitchShifttingSlide = document.getElementById('pitchShiftting')
const playbackRateSlide = document.getElementById('playbackRate')
const tremoloSlide = document.getElementById('tremolo')
const lpfSlide = document.getElementById('lpf')
const hpfSlide = document.getElementById('hpf')
const attackSlide = document.getElementById('attack')
const decaySlide = document.getElementById('decay')
const sustainSlide = document.getElementById('sustain')
const releaseSlide = document.getElementById('release')

const envParams = document.getElementById('envParams')
const tempo = document.getElementById('bpm')
const gain = document.getElementById('gain')

const beatListens = {
    beatOne: document.getElementById('beatOne'),
    beatTwo: document.getElementById('beatTwo'),
    beatThree: document.getElementById('beatThree'),
    beatFour: document.getElementById('beatFour')
}

const recBtn = document.getElementById('recBtn')
const stopRecBtn = document.getElementById('stopRecBtn')


// --------- ASSIGN VARIABLES TO PARAMETERS --------------//

// envolvente do som
let env = new Tone.AmplitudeEnvelope({
    attack: defaultValues.envAttack,
    decay: defaultValues.envDecay,
    sustain: defaultValues.envSus,
    release: defaultValues.envRelease,
})

// valor para o pitchshifting
const shiftP = new Tone.FrequencyShifter(defaultValues.addFreq)

// volume geral: valores entre 0. e 1. (possibilidade de mais para sons muito baixos?)
const gainNode = new Tone.Gain(defaultValues.gain)

/* descrição do tone.js:
    "Tremolo modulates the amplitude of an incoming signal using an LFO. 
    The effect is a stereo effect where the modulation phase is inverted in each channel"
    
    argumentos: frequência do LFO, depth(dry-wet)
    
    em suma, se o tremolo tiver uma freq < 20 vai fazer panning(? confirmar)*/
const tremolo = new Tone.Tremolo(defaultValues.tremLFO, defaultValues.tremDepth)

//filtros
const lowPassF = new Tone.Filter(defaultValues.lpf, "lowpass")
const highPassF = new Tone.Filter(defaultValues.hpf, "highpass")

// definir o tempo
Tone.Transport.bpm.value = defaultValues.bpm;

// para fazer um ritmo com o som, como se fosse um compasso --- definição rítmica: 1 = som on; 0 = som off
let beat = [beatStage.one, beatStage.two, beatStage.three, beatStage.four]
let beatIdx = 0

// ---------- API SEARCH AND PLAY SOUND -------------//

window.onload = (event) => {
    /* Loop conforme o tempo establecido em Tone.Transport.bpm.value - o som acontece a cada 4n = semínima;
    O env ativa o release 4t depois do ataque;

    A cada nova passagem no loop é avaliado se o beat é on/off e incrementado através da função nextInx, 
    o "compasso" anteriormente definido vai estar em loop: 
    em suma, existe o loop do tone.loop e o loop do compasso criado através da inc do beatIdx

    Esta função está no window.load pois só pode acontecer uma vez, se fosse chamada no start o tempo aumentava (a função era chamada várias vezes??) WHY?!
*/

    Tone.Transport.scheduleRepeat((time) => {
        if (playLoop == true) {
            if (beat[beatIdx] == 1) {
                player.start();
                tremolo.start()
                env.attackCurve = "sine"; // tipos de curva possíveis: linear, exponential, sine, cosine, bounce, ripple, step
                env.triggerAttackRelease('8t');
                console.log(`${beatIdx} = on`);

                nextIdx()
            } else {
                console.log(`${beatIdx} = off`);
                nextIdx()
            }
        }
    }, "4n");

    Tone.Transport.start();
};

function nextIdx() {
    beatIdx++

    // se o ciclo de beats estiver concluído, volta ao início, criando loop
    if (beatIdx == beat.length) {
        beatIdx = 0;
    }
}

searchBtn.addEventListener('click', async function () {
    playLoop = false

    let searchQ = document.getElementById('searchQ')
    // pedido à API usando a função fetch ---- não esquecer o await, que só funciona com funções assíncronas!
    responseSounds = await fetch(`https://freesound.org/apiv2/search/text/?query=${searchQ.value}&filter=duration:[0.05 TO 10.0]%20license:"Creative Commons 0"&format=json&token=${passAPI}`)

    // o ok refere-se aos códigos 200 -- o circuito funcionou
    if (responseSounds.ok) {
        sounds = await responseSounds.json()
        console.log(sounds);

        // index para os sons 
        soundIndex = 0
        maxSoundIdx = sounds.results.length - 1

        chooseSound()
    } else {
        alert('Erro: ' + responseSounds.statusText)
    }
})


async function chooseSound() {
    //vai buscar um som (por ordem) à array de sons
    rChoosenSound = await fetch(`https://freesound.org/apiv2/sounds/${sounds.results[soundIndex].id}/?format=json&token=${passAPI}`)

    if (rChoosenSound.ok) {
        choosenSound = await rChoosenSound.json()
        // console.log(choosenSound);

        finalSound = new Audio(choosenSound.previews['preview-hq-mp3'])  // a .previews é o áudio do som

        // console.log(finalSound);
    } else {
        alert('Erro: ' + rChoosenSound.statusText)
    }

}


startBtn.addEventListener('click', async function () {
    await Tone.start()
    beatIdx = 0 // para  começar o compasso no 1º tempo

    playSound()
})

function playSound() {
    //criar um player com o som
    player = new Tone.Player(finalSound.src)

    // só começa quando o som estiver carregado
    Tone.loaded().then(() => {
        playLoop = true
        //Time stretch + adicionar os filtros e efeitos
        player.playbackRate = pbRate;
        player.chain(shiftP, env, gainNode, tremolo, lowPassF, highPassF, Tone.Destination)
        Tone.Destination.connect(recorder)
    });
}


// ------------ PARAR SOM E AVANÇAR/RETROCEDER NA ARRAY DE SONS -------------//

stopBtn.addEventListener('click', function () {
    playLoop = false
})

nextSound.addEventListener('click', function () {
    playLoop = false

    if (soundIndex < maxSoundIdx) {
        soundIndex++
    } else {
        soundIndex = 0
    }

    chooseSound()
    // console.log(soundIndex);
})

prevSound.addEventListener('click', function () {
    playLoop = false

    if (soundIndex > 0) {
        soundIndex--
    } else {
        soundIndex = maxSoundIdx
    }

    chooseSound()
    // console.log(soundIndex);
})



// ---------- FILTROS E ETC -------------//

function startStop() {
    /* esta função vai estar no fim de cada mudança no som
    atualiza os valores no chain
    e se não fizer isto fica com mais que um som */

    playLoop = false
    playSound()
}

pitchShifttingSlide.addEventListener('change', function () {
    shiftP.frequency.rampTo(pitchShifttingSlide.value * 100, 0.1)
    console.log(`pitch shiftting: ${pitchShifttingSlide.value / 100} meios-tons`);

    startStop()
})

playbackRate.addEventListener('change', function () {
    pbRate = playbackRateSlide.value
    console.log(`time stretch: ${playbackRateSlide.value}`);

    startStop()
})

tremoloSlide.addEventListener('change', function () {
    tremolo.frequency.rampTo(tremoloSlide.value, 0.1)
    console.log(`tremolo: ${tremoloSlide.value}`);

    startStop()
})

lpfSlide.addEventListener('change', function () {
    lowPassF.frequency.rampTo(lpfSlide.value, 0.1);
    console.log(`lpf: ${lpfSlide.value}`);

    startStop()
})

hpfSlide.addEventListener('change', function () {
    highPassF.frequency.rampTo(hpfSlide.value, 0.1);
    console.log(`Hpf: ${hpfSlide.value}`);

    startStop()
})

envParams.addEventListener('change', function () {
    const newAttack = document.getElementById('attack').value
    const newDecay = document.getElementById('decay').value
    const newSus = document.getElementById('sustain').value
    const newRelease = document.getElementById('release').value

    env = new Tone.AmplitudeEnvelope({
        attack: newAttack,
        decay: newDecay,
        sustain: newSus,
        release: newRelease,
    })

    console.log(`Envelope Params: ${newAttack} ${newDecay} ${newSus} ${newRelease}`);
    startStop()
})

tempo.addEventListener('change', function () {
    Tone.Transport.bpm.value = tempo.value
    console.log(`BPM: ${tempo.value}`);

    startStop()
})

gain.addEventListener('change', function () {
    gainNode.gain.rampTo(gain.value, 0.1);
    /* a função new Tone.Gain(0) definiu o volume inicial
        para mexer neste, basta usar este rampTo
        -- 
        voltar a definir valores na função inicial não resulta
        aumenta apenas volume infinitamente  */
    console.log(`Gain: ${gain.value}`);

    startStop()
})

// ---------- BEATS - RHYTHM -------------//

beatListens.beatOne.addEventListener('change', function () {
    if (beatListens.beatOne.checked == true) {
        beatStage.one = 1
    } else {
        beatStage.one = 0
    }

    beat = [beatStage.one, beatStage.two, beatStage.three, beatStage.four]
})

beatListens.beatTwo.addEventListener('change', function () {
    if (beatListens.beatTwo.checked == true) {
        beatStage.two = 1
    } else {
        beatStage.two = 0
    }

    beat = [beatStage.one, beatStage.two, beatStage.three, beatStage.four]
})

beatListens.beatThree.addEventListener('change', function () {
    if (beatListens.beatThree.checked == true) {
        beatStage.three = 1
    } else {
        beatStage.three = 0
    }

    beat = [beatStage.one, beatStage.two, beatStage.three, beatStage.four]
})

beatListens.beatFour.addEventListener('change', function () {
    if (beatListens.beatFour.checked == true) {
        beatStage.four = 1
    } else {
        beatStage.four = 0
    }

    beat = [beatStage.one, beatStage.two, beatStage.three, beatStage.four]
})



recBtn.addEventListener('click', async function () {
    // start recording
    recorder.start();
})

stopRecBtn.addEventListener('click', async function () {
    // the recorded audio is returned as a blob --- dos exemplos, ver o que é blob?
    const recording = await recorder.stop();
    // download the recording by creating an anchor element and blob url
    const url = URL.createObjectURL(recording);
    const anchor = document.createElement("a");
    anchor.download = "recording.webm";
    anchor.href = url;
    anchor.click();
})




// ------------ OTHER JS STUFF ------------//

var pressEnter = document.getElementById("searchQ");

// submit search with enter
pressEnter.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        // Cancel the default action, if needed
        event.preventDefault();
        document.getElementById("searchBtn").click();
    }
});

// enable popovers

$(function () {
    $('[data-toggle="popover"]').popover()
})

// get default values on double click

stopBtn.addEventListener('dblclick', (e) => {
    playLoop = false
    document.getElementById('form').reset();

    shiftP.frequency.rampTo(0, 0.1)
    pbRate = defaultValues.pbRate
    tremolo.frequency.rampTo(defaultValues.tremLFO, 0.1)
    lowPassF.frequency.rampTo(defaultValues.lpf, 0.1);
    highPassF.frequency.rampTo(defaultValues.hpf, 0.1);

    env = new Tone.AmplitudeEnvelope({
        attack: defaultValues.envAttack,
        decay: defaultValues.envDecay,
        sustain: defaultValues.envSus,
        release: defaultValues.envRelease,
    })

    gainNode.gain.rampTo(defaultValues.gain, 0.1);
});
