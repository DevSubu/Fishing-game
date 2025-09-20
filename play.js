import { initMapScreen } from './map.js'
import { catchableItems } from './catchable_items/fish.js'
let seaTop = 300;
let clouds = [];

// audio/bgm manager
const audioManager = {
  currentAudio: null,
  currentMapName: null,
  currentVolume: parseInt(localStorage.getItem("musicVolume")) || 100,
  introMusic: new Audio('audio/[MapleStory BGM] Intro.mp3'),
  mapMusic: {
    'Tortuga Bay': new Audio('audio/[MapleStory BGM] Ereve_ Raindrop Flower.mp3'),
    'Kraken Cove': new Audio('audio/[MapleStory BGM] Ellinia_ Missing You.mp3'),
    'Skeleton Atoll': new Audio('audio/[MapleStory BGM] Ereve_ Queen\'s Garden.mp3')
  },

  init() {
    // initialize all audio volumes
    const savedVolume = parseInt(localStorage.getItem("musicVolume")) || 100;
    this.setVolume(savedVolume);
  },

  setVolume(volume) {
    this.currentVolume = volume;
    localStorage.setItem("musicVolume", volume);
    const normalizedVolume = volume / 100; // volume range from 0 to 1
    if (this.currentAudio) {
      this.currentAudio.volume = normalizedVolume;
    }
    // set volume for all music tracks
    this.introMusic.volume = normalizedVolume;
    Object.values(this.mapMusic).forEach(audio => {
      audio.volume = normalizedVolume;
    });
  },

  playIntroMusic() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }
    this.introMusic.loop = true;
    this.introMusic.volume = this.currentVolume / 100;
    this.introMusic.play();
    this.currentAudio = this.introMusic;
    this.currentMapName = null;
  },
  
  playMapMusic(mapName) {
    // plays the corresponding music for the current map
    if (this.currentMapName !== mapName) {
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      }
      
      const audio = this.mapMusic[mapName];
      if (audio) {
        audio.loop = true;
        audio.play();
        this.currentAudio = audio;
        this.currentMapName = mapName;
      }
    }
  },

  stopAll() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }
  }
};

// initialize audio manager right after creation
audioManager.init();
// to use in other files
export {audioManager};

const RARITY_COLORS = {
  'Common': '#808080',
  'Uncommon': '#00ff00',
  'Rare': '#0000ff',
  'Legendary': '#ffd700'
};

const CATCH_CHANCES = {
  'Salmon': 0.1,
  'Tuna': 0.1,
  'Carp': 0.1,
  'Clown Fish': 0.1,
  'Swordfish': 0.1,
  'Oarfish': 0.075,
  'Old Boot': 0.1,
  'Trash': 0.1,
  'Hammerhead Shark': 0.05,
  'Anglerfish': 0.05,
  'Blobfish': 0.05,
  'Piranha': 0.075,
  'Squid': 0.075
};

export function initPlayScreen(switchTo) {
  return (p) => {
    // --- Map Themes (copied from map.js) ---
    const mapThemes = [
      {
        name: 'Tortuga Bay',
        oceanColor: [50, 150, 200],
        boatColor: '#8B4513',
        islandColor: '#228B22',
        decorations: (p) => {
          drawClouds(p);
          drawTortugaEffects(p);
        }
      },
      {
        name: 'Kraken Cove',
        oceanColor: [45, 60, 90],
        boatColor: '#3A3F44',
        islandColor: '#303030',
        decorations: (p) => {
          drawClouds(p);
          drawGlowingLights(p);
        }
      },
      {
        name: 'Skeleton Atoll',
        oceanColor: [40, 60, 70],
        boatColor: '#DAA520',
        islandColor: '#A9A9A9',
        decorations: (p) => {
          drawClouds(p);
          drawSkeletonEffects(p);
        }
      }
    ];

    let mapIndex = parseInt(localStorage.getItem("selectedMapIndex")) || 0;
    let seaTop = 150;
    let justCaughtFish = false;

    // prices for each upgrade
    const UPGRADE_COSTS = {
      rod: [0, 500, 5000],
      boat: [0, 2500, 10000],
      bait: [0, 100, 300]
    };

    const gameState = {
      equippedItems: {
        rod: 0,
        boat: 0,
        bait: 0
      },
      unlockedItems: {
        rod: [true, false, false],
        boat: [true, false, false],
        bait: [true, false, false]
      },
      currentCatch: null,
      isFishOnHook: false,
      fishInventory: []
    };

    let boatImg, personImg;
    let exitButton, upgradeButton;
    let coins = parseInt(localStorage.getItem("coins")) || 0;
    const COIN_TEXT_SIZE = 18;

    // upgrade pop-up variables
    let isUpgradeOpen = false;
    let closeButton;
    let rodImages = [], boatImages = [], baitImages = [];

    // Fishing variables
    let rodImage, hookImage;
    let hookAngle = 0;
    let hookSwingSpeed = 0.03;
    let hookLength = 80;
    let isCasting = false;
    let castProgress = 0;
    let castDirection = 1;
    const castSpeed = 8;
    let maxCastDepth;
    let hookX, hookY;
    let fishes = [];

    // Casting bar variables
    let showCastBar = false;
    let sliderX = 0;
    let sliderDirection = 1;
    let castBarX, castBarY, castBarWidth, castBarHeight;
    let correctZoneStart, correctZoneEnd;
    let sliderSpeed = 8 - gameState.equippedItems.rod;
    let barWasShown = false;

    // Reeling variables
    let isReeling = false;
    let reelProgress = 0;
    const REEL_MAX = 100;
    let reelDifficulty = 1;
    let fishPullTimer = 0;
    let fishPullStrength = 0;

    // Fishing state variables
    let fishingPhase = 'idle'; // idle, casting, waiting, reeling
    let biteTimer = 0;
    let maxBiteTime = 0;
    let fishingBarProgress = 0;
    let fishingLinePosition = 0; // 0 to 1, start at bottom
    let correctZonePosition = 0; // 0 to 1, start at bottom
    let correctZoneHeight = 0.2; // percentage of bar height
    let fishDifficulty = 1;
    const FISHING_BAR_HEIGHT = 200;
    const FISHING_BAR_WIDTH = 40;
    const ZONE_MOVE_SPEED = 0.015;
    const LINE_MOVE_SPEED = 0.016; // doubled from 0.008

    p.preload = () => {
      boatImg = p.loadImage("images/boat-without-mast-hi.png");
      personImg = p.loadImage("images/fisherman.png");
      rodImage = p.loadImage("equipment/rod_icon_1.png");
      hookImage = p.loadImage("equipment/bait_icon_1.png");

      // Load catchable items images
      catchableItems.forEach(item => {
        item.img = p.loadImage(item.icon);
      });

      // upgrade images
      for (let i = 1; i <= 3; i++) {
        rodImages.push(p.loadImage(`equipment/rod_icon_${i}.png`));
        baitImages.push(p.loadImage(`equipment/bait_icon_${i}.png`));
      }
      boatImages = [
        p.loadImage("images/boat-without-mast-hi.png"),
        p.loadImage("equipment/ship_icon_1.png"),
        p.loadImage("equipment/ship_icon_3.png")
      ];

      loadGameState();
    };

    p.setup = () => {
      p.createCanvas(p.windowWidth, p.windowHeight);

      // UI Elements
      const backButton = p.createButton('⬅ Back to Map');
      backButton.position(20, 20);
      backButton.size(140, 40);
      backButton.style('font-family', "'Pirata One', cursive");
      backButton.style('font-size', '18px');
      backButton.mousePressed(() => {
        cleanupUI();
        saveGameState();
        p.remove();
        switchTo(initMapScreen(switchTo));
      });

      upgradeButton = p.createButton("🎣 Upgrades");
      upgradeButton.position(p.width - 175, 60);
      upgradeButton.size(150, 50);
      styleButton(upgradeButton, "brown");
      upgradeButton.mousePressed(() => {
        isUpgradeOpen = true;
        createUpgradeOverlay();
      });
      p.textAlign(p.RIGHT, p.CENTER);

      upgradeButton.attribute("tabindex", "-1");
      // Initialize casting bar
      castBarWidth = 400;
      castBarHeight = 30;
      castBarX = (p.width - castBarWidth) / 2;
      castBarY = p.height - 150;
      sliderX = castBarX;

      // Calculate max cast depth based on rod level
      maxCastDepth = p.height * (0.5 + (gameState.equippedItems.rod * 0.1));

      // Spawn fish
      spawnFish(8);
      // spawn clouds
      clouds = []; // resets clouds so they dont stack when page reloads
      for (let i = 0; i < 40; i++) {
        clouds.push({
          x: Math.random() * p.width,
          y: 50 + Math.random() * 80,
          speed: 0.2 + Math.random() * 0.3,
          size: 50 + Math.random() * 40
        });
      } 

      // ensure corresponding music is playing for current map
      const theme = mapThemes[mapIndex];
      audioManager.playMapMusic(theme.name);

      // modify back button to handle playback of music
      backButton.mousePressed(() => {
        cleanupUI();
        saveGameState();
        p.remove();
        switchTo(initMapScreen(switchTo));
      });
    };

    function spawnFish(count) {
      const currentTheme = mapThemes[mapIndex].name;
      const themeFish = catchableItems.filter(fish => 
        fish.themes.includes(currentTheme)
      );
    
      if (themeFish.length === 0) return;
    
      // adding skeletons in ATOLL
      if (currentTheme === "Skeleton Atoll") {
        const skeleton = catchableItems.find(fish => fish.species === "Skeleton");
        if (skeleton) {
          fishes.push({
            ...skeleton,
            x: p.random(20, p.width - 20),
            y: p.random(p.height * 0.5 + 25, p.height - 25),
            size: 40,
            speed: p.random(0.3, 0.8) * (Math.random() < 0.5 ? 1 : -1), 
            caught: false
          });
          count--; 
        }
      }
    
      // normal fishes for the rest
      for (let i = 0; i < count; i++) {
        const fishType = themeFish[Math.floor(Math.random() * themeFish.length)];
        const size = p.random(30, 50);
        fishes.push({
          ...fishType,
          x: p.random(20, p.width - 20),
          y: p.random(p.height * 0.5 + size / 2, p.height - size / 2),
          size,
          speed: p.random(0.5, 1.5) * (Math.random() < 0.5 ? 1 : -1),
          caught: false
        });
      }
    }

    p.draw = () => {
      // ----------------------------BACKGROUND-----------------------------------------
      const theme = mapThemes[mapIndex];
      drawPirateOcean(theme);

      // Draw boat and fisherman
      const boatX = p.width - 300;
      const boatY = seaTop + 160;
      const rockAngle = p.radians(p.sin(p.frameCount * 0.05) * 3);

      p.push();
      p.translate(boatX + 100, boatY + 50);
      p.rotate(rockAngle);
      p.imageMode(p.CENTER);
      p.image(boatImages[gameState.equippedItems.boat], 0, 0, 200, 100);
      p.image(personImg, 10, -70, 100, 120);
      p.pop();

      // Draw coin counter
      p.textAlign(p.RIGHT, p.CENTER);
      let padding = 10;
      let boxWidth = 180;
      let boxHeight = 40;
      let x = p.width - boxWidth - padding;
      let y = padding;

      p.fill(50, 50, 70, 200);
      p.stroke(255);
      p.strokeWeight(2);
      p.rect(x, y, boxWidth, boxHeight, 10);

      p.textSize(COIN_TEXT_SIZE);
      p.noStroke();
      p.fill(255);
      p.text(`Coins: ${coins}`, x + boxWidth - padding, y + boxHeight / 2);

      // Draw fish
      drawFish();

      // Draw fishing equipment
      drawFishingEquipment();

      // Draw cast bar if active
      if (showCastBar) {
        drawCastBar();
      }

      // Draw reel progress if reeling
      if (isReeling) {
        drawReelProgress();
      }

      // Update fishing mechanics
      if (fishingPhase === 'waiting' && !justCaughtFish) {
        biteTimer++;
        if (biteTimer >= maxBiteTime) {
          fishingPhase = 'idle';
          biteTimer = 0;
        }
      } else if (fishingPhase === 'reeling') {
        // Move fish line with smoother movement
        const noise = p.noise(p.frameCount * 0.03) * 1.5 - 0.75; // Reduced noise frequency and amplitude
        // Add center-seeking bias to prevent sticking at edges
        const centerBias = (0.5 - fishingLinePosition) * 0.004;
        // Smooth movement by averaging with previous position
        const targetPosition = fishingLinePosition + (noise * LINE_MOVE_SPEED + centerBias) * fishDifficulty;
        fishingLinePosition = p.lerp(fishingLinePosition, targetPosition, 0.3);
        fishingLinePosition = p.constrain(fishingLinePosition, 0.05, 0.95);

        // Move correct zone based on spacebar - allow full range
        if (p.keyIsPressed && p.key === ' ') {
          correctZonePosition = Math.min(1, correctZonePosition + ZONE_MOVE_SPEED);
        } else {
          correctZonePosition = Math.max(0, correctZonePosition - ZONE_MOVE_SPEED);
        }

        // Check if line is in correct zone
        const lineInZone = fishingLinePosition >= correctZonePosition - correctZoneHeight / 2 &&
          fishingLinePosition <= correctZonePosition + correctZoneHeight / 2;

        // Update progress at 1/3 speed
        if (lineInZone) {
          fishingBarProgress += 0.1;
        } else {
          fishingBarProgress -= 0.1;
        }
        fishingBarProgress = p.constrain(fishingBarProgress, 0, 100);

        // Check win/lose conditions
        if (fishingBarProgress >= 100) {
          completeCatch();
          fishingPhase = 'idle';
        } else if (fishingBarProgress <= 0) {
          gameState.isFishOnHook = false;
          gameState.currentCatch = null;
          fishingPhase = 'idle';
        }
      }
    };

    function drawFish() {
      for (let fish of fishes) {
        if (!fish.caught) {
          // Move fish
          fish.x += fish.speed;

          // Reverse direction at edges
          if (fish.x < 0 || fish.x > p.width) {
            fish.speed *= -1;
          }

          // Draw fish
          p.push();
          p.translate(fish.x, fish.y);
          p.imageMode(p.CENTER);
          
          if (fish.speed > 0) {
            p.scale(-1, 1); // flip only if moving right
          }
          
          p.image(fish.img, 0, 0, fish.size, fish.size);
          p.pop();

          // Check hook collision if casting
          if (isCasting && castDirection === -1 && !gameState.isFishOnHook) {
            const hookRadius = 15;
            const fishRadius = fish.size / 2;
            const distance = p.dist(hookX, hookY, fish.x, fish.y);

            if (distance < hookRadius + fishRadius) {
              // Fish caught!
              fish.caught = true;
              gameState.isFishOnHook = true;
              gameState.currentCatch = fish;
              reelDifficulty = 1 + (fish.size / 50); // Bigger fish are harder to reel
              startReeling();
            }
          }
        }
      }
    }

    function drawFishingEquipment() {
      // Match boat placement
      const boatX = p.width - 300;
      const boatY = seaTop + 160;
      const rockAngle = p.radians(p.sin(p.frameCount * 0.05) * 3); // for rocking
    
      // Rod base (relative to boat)
      const rodBaseX = boatX + 90;
      const rodBaseY = boatY - 20;
    
      // Rod dimensions
      const rodLength = 160 //+ (gameState.equippedItems.rod * 20);
      const rodWidth = 30;
      const rodAngle = -p.PI / 3.8;
    
      // Tip offset
      const imageRodTipOffset = rodLength / 2 - 5;
      const rodTipX = rodBaseX - 105 + imageRodTipOffset * Math.cos(rodAngle);
      const rodTipY = rodBaseY + 10 + imageRodTipOffset * Math.sin(rodAngle);
    
      // Hook positioning and animation
      if (fishingPhase === 'idle') {
        // Swinging hook animation when idle
        hookAngle += hookSwingSpeed;
        const swingRadius = 5;
        hookX = rodTipX + swingRadius * Math.sin(hookAngle);
        hookY = rodTipY + Math.cos(hookAngle) * 3 + 15;
      } else {
        // Static hook during casting / reeling
        hookX = rodTipX - 300;
        const waterSurfaceY = seaTop + 200;
        hookY = waterSurfaceY + 15;
        hookY += p.sin(p.frameCount * 0.05) * 3; // bobbing
      }
    
      // ---- Draw rotated rod on rocking boat ----
      p.push();
      p.translate(rodBaseX, rodBaseY);
      p.rotate(rodAngle + rockAngle); // adds rocking
      p.imageMode(p.CENTER);
      p.image(rodImages[gameState.equippedItems.rod], 0, 0, rodWidth, rodLength);
      p.pop();
      p.imageMode(p.CORNER);
    
      // ---- Draw fishing line ----
      p.stroke(255);
      p.strokeWeight(2);
      p.line(rodTipX, rodTipY, hookX, hookY);
    
      // ---- Draw hook ----
      p.imageMode(p.CENTER);
      p.image(baitImages[gameState.equippedItems.bait], hookX, hookY, 30, 30);
      p.imageMode(p.CORNER);
    
      // Draw caught fish
      if (gameState.isFishOnHook && gameState.currentCatch) {
        p.push();
        p.translate(hookX, hookY);
        p.imageMode(p.CENTER);
        const wiggle = p.sin(p.frameCount * 0.1) * 5;
        p.rotate(wiggle * 0.01);
        const fish = gameState.currentCatch;
        p.image(fish.img, 0, 0, fish.size, fish.size);
        p.pop();
      }
    
      // Bite notification
      if (fishingPhase === 'waiting' && biteTimer > maxBiteTime - 60) {
        p.fill(255);
        p.textSize(24);
        p.textAlign(p.CENTER);
        p.text('!', hookX, hookY - 30);
      }
    
      // Reeling minigame
      if (fishingPhase === 'reeling') {
        drawFishingMinigame();
      }
    }

    function drawFishingMinigame() {
      const barX = p.width / 2 - FISHING_BAR_WIDTH / 2;
      const barY = p.height / 2 - FISHING_BAR_HEIGHT / 2;

      // Draw background bar
      p.fill(50);
      p.rect(barX, barY, FISHING_BAR_WIDTH, FISHING_BAR_HEIGHT);

      // Draw correct zone
      p.fill(0, 255, 0, 180);
      const zoneY = barY + (FISHING_BAR_HEIGHT * (1 - correctZonePosition - correctZoneHeight / 2));
      p.rect(barX, zoneY, FISHING_BAR_WIDTH, FISHING_BAR_HEIGHT * correctZoneHeight);

      // Draw fish line
      p.fill(255);
      const lineY = barY + (FISHING_BAR_HEIGHT * (1 - fishingLinePosition));
      p.rect(barX, lineY, FISHING_BAR_WIDTH, 4);

      // Draw progress bar
      const progressBarWidth = 200;
      p.fill(50);
      p.rect(barX + FISHING_BAR_WIDTH + 10, barY, 20, FISHING_BAR_HEIGHT);
      p.fill(0, 255, 0);
      const progressHeight = (fishingBarProgress / 100) * FISHING_BAR_HEIGHT;
      p.rect(barX + FISHING_BAR_WIDTH + 10, barY + FISHING_BAR_HEIGHT - progressHeight, 20, progressHeight);
    }

    function drawCastBar() {
      // Draw cast bar background
      p.noStroke();
      p.fill(255, 255, 255, 180);
      p.rect(castBarX, castBarY, castBarWidth, castBarHeight, 10);

      // Draw correct zone
      p.fill(0, 255, 0, 180);
      p.rect(correctZoneStart, castBarY, correctZoneEnd - correctZoneStart, castBarHeight, 10);

      // Draw slider
      p.fill(255, 0, 0);
      p.rect(sliderX - 5, castBarY - 10, 10, castBarHeight + 20, 5);

      // Move slider
      sliderX += sliderDirection * sliderSpeed;
      if (sliderX < castBarX || sliderX > castBarX + castBarWidth) {
        sliderDirection *= -1;
      }
    }

    function drawReelProgress() {
      const reelBarWidth = 300;
      const reelBarHeight = 25;
      const reelBarX = p.width / 2 - reelBarWidth / 2;
      const reelBarY = p.height - 100;

      // Background
      p.fill(50, 50, 70, 200);
      p.rect(reelBarX, reelBarY, reelBarWidth, reelBarHeight, 10);

      // Progress bar
      p.fill(0, 200, 0);
      p.rect(reelBarX, reelBarY, reelBarWidth * (reelProgress / REEL_MAX), reelBarHeight, 10);

      // Border
      p.noFill();
      p.stroke(255);
      p.strokeWeight(2);
      p.rect(reelBarX, reelBarY, reelBarWidth, reelBarHeight, 10);

      // Text
      p.fill(255);
      p.noStroke();
      p.textAlign(p.CENTER, p.CENTER);
      p.textAlign(p.RIGHT, p.CENTER);
    }

    function startReeling() {
      isReeling = true;
      reelProgress = 0;
    }
  
    function completeCatch() {
      console.log("CompleteCatch was called");
      const caughtFish = gameState.currentCatch;
      if (!caughtFish) return; // fail-safe
    
      // Update coins based off a multiplier
      let multiplier = 1;
      switch (gameState.equippedItems.rod) {
        case 0: multiplier = 1; break;     // Standard rod
        case 1: multiplier = 1.5; break;   // Gold rod
        case 2: multiplier = 2; break;     // Diamond rod
      }
      coins += caughtFish.base_value * multiplier;

      gameState.fishInventory.push(caughtFish);
    
      // ✅ Reset state *before* the popup timer
      justCaughtFish = true;
      fishingPhase = 'idle';
      fishingBarProgress = 0;
      fishingLinePosition = 0;
      correctZonePosition = 0;
      gameState.isFishOnHook = false;
      gameState.currentCatch = null;
      isReeling = false;
    
      // Show catch popup
      const displayContainer = p.createDiv('');
      displayContainer.position(p.width / 2 - 150, p.height / 2 - 150);
      displayContainer.size(300, 300);
      displayContainer.style('background-color', 'rgba(0, 0, 0, 0.8)');
      displayContainer.style('border-radius', '10px');
      displayContainer.style('display', 'flex');
      displayContainer.style('flex-direction', 'column');
      displayContainer.style('align-items', 'center');
      displayContainer.style('justify-content', 'center');
      displayContainer.style('z-index', '1000');
      displayContainer.style('padding', '20px');
    
      const img = p.createImg(caughtFish.icon, 'Caught Item');
      img.parent(displayContainer);
      img.size(200, 200);
      img.style('object-fit', 'contain');
    
      const text = p.createDiv(
        `<div style="color: ${RARITY_COLORS[caughtFish.rarity]}; font-size: 24px; margin: 10px">
         ${caughtFish.rarity}</div>
         <div style="color: white; font-size: 20px">
         ${caughtFish.species}<br>
         +${caughtFish.base_value} coins
         (${multiplier}x multiplier)</div>` // figure out how to add in pop-up
      );
      text.parent(displayContainer);
      text.style('text-align', 'center');
      text.style('font-family', "'Pirata One', cursive");
    
      setTimeout(() => {
        displayContainer.remove();
        justCaughtFish = false;
        console.log("Catch popup removed, game unfrozen");
      }, 4000);
    
      spawnFish(1);
      saveGameState();
    }

    function drawPirateOcean(theme) {
      p.background(...theme.oceanColor);
      p.noStroke();
    
      // Draw ocean fill (semi-transparent)
      const seaHeight = p.height - seaTop;
      p.fill(theme.oceanColor[0], theme.oceanColor[1], theme.oceanColor[2], 220);
      p.rect(0, seaTop, p.width, seaHeight);
    
      // Whitecaps mid-ocean
      for (let y = seaTop + 205; y < p.height + 120; y += 38) {  
        for (let x = -60; x < p.width + 60; x += 75) {  
          p.fill(255, 255, 255, 40);
          p.ellipse(
            x + p.sin(p.frameCount * 0.05 + x * 0.01) * 20, 
            y, 
            120, 
            22    
          );
        }
      }
      // Wavy top border (under boat)
      const boatY = seaTop + 160;
      const waveBase = boatY + 50;
    
      p.noFill();
      p.stroke(255, 255, 255, 100);
      p.strokeWeight(2);
      p.beginShape();
      for (let x = 0; x <= p.width; x += 10) {
        const waveY = waveBase + p.sin(p.frameCount * 0.05 + x * 0.05) * 5;
        p.vertex(x, waveY);
    
        // Extra whitecap on crest
        p.push();
        p.noStroke();
        p.fill(255, 255, 255, 180);
        p.ellipse(x, waveY - 6, 15, 10);
        p.pop();
      }
      p.endShape();
    
      // Decorations (e.g., clouds)
      if (theme.decorations) {
        theme.decorations(p);
      }
    }


    function drawClouds(p) {
      p.noStroke();
    
      for (let cloud of clouds) {
        // Update position
        cloud.x += cloud.speed;
    
        // Wrap around
        if (cloud.x > p.width + 100) {
          cloud.x = -100;
          cloud.y = 50 + Math.random() * 80;
        }
    
        const c = p.color(255, 255, 255, 180);
        p.fill(c);
    
        // Draw main cloud puff
        p.ellipse(cloud.x, cloud.y, cloud.size, cloud.size * 0.6);
        // Side puffs
        p.ellipse(cloud.x + 30, cloud.y + 10, cloud.size * 0.8, cloud.size * 0.5);
        p.ellipse(cloud.x - 30, cloud.y + 10, cloud.size * 0.8, cloud.size * 0.5);
      }
    }

    function selectCatchBySpecies() {
      const roll = Math.random();
      let threshold = 0;
      
      for (const [species, chance] of Object.entries(CATCH_CHANCES)) {
        threshold += chance;
        if (roll <= threshold) {
          return catchableItems.find(item => item.species === species);
        }
      }
          // Fallback to Old Boot if something goes wrong

      return catchableItems.find(item => item.species === 'Old Boot');
    }


    p.keyPressed = () => {
      // Cheat codes for debugging
      if (p.key === '=') coins += 1000;
      if (p.key === '-') coins -= 1000;
      if (p.key === 'R' || p.key === 'r') {
        document.activeElement.blur(); 
        const confirmReset = window.confirm("Are you sure you want to reset your game?");
        if (confirmReset) {
          resetGameState();
        }
      }

      // Cast fishing line
      if (p.key === ' ' && !justCaughtFish) {
        if (fishingPhase === 'idle' && !showCastBar) {
          // Start casting minigame
          showCastBar = true;
          barWasShown = true;
          sliderX = castBarX;
          sliderDirection = 1;

          const rodTier = gameState.equippedItems.rod;
          const maxZoneWidth = 120;
          const minZoneWidth = 50;
          const zoneWidth = minZoneWidth + (rodTier / 2) * (maxZoneWidth - minZoneWidth);

          correctZoneStart = castBarX + Math.random() * (castBarWidth - zoneWidth);
          correctZoneEnd = correctZoneStart + zoneWidth;

          sliderSpeed = 8 - gameState.equippedItems.rod;
        } else if (barWasShown) {
          // Check if slider is within correct zone
          const isSuccessful = sliderX >= correctZoneStart && sliderX <= correctZoneEnd;
          showCastBar = false;
          barWasShown = false;

          if (isSuccessful) {
            handleSuccessfulCast();
          }
        } else if (fishingPhase === 'waiting' && biteTimer > maxBiteTime - 60) {
          // Select catch at bite moment
          gameState.currentCatch = selectCatchBySpecies();
          fishingPhase = 'reeling';
          fishingBarProgress = 50;
          fishingLinePosition = 0;
          correctZonePosition = 0;
          
          const rarity = gameState.currentCatch.rarity;
          if (rarity === 'Common') {
            fishDifficulty = 1.5;
          } else if (rarity === 'Uncommon') {
            fishDifficulty = 2.5;
          } else if (rarity === 'Rare') {
            fishDifficulty = 4.5;
          } else if (rarity === 'Legendary') {
            fishDifficulty = 7.0;
          }
        }
      }
    };

    p.keyReleased = () => {
    };

    function handleSuccessfulCast() {
      fishingPhase = 'casting';
      maxBiteTime = p.random(240, 720); // 4-12 seconds at 60fps
      biteTimer = 0;
      fishingPhase = 'waiting';
    }

    function styleButton(btn, color) {
      btn.style("font-family", "'Pirata One', cursive");
      btn.style("font-size", "28px");
      btn.style("background-color", color);
      btn.style("color", "#FFFFFF");
      btn.style("border", "none");
      btn.style("border-radius", "12px");
      btn.style("box-shadow", "0px 4px 10px rgba(0, 0, 0, 0.2)");
      btn.style("font-weight", "bold");
      btn.style("cursor", "pointer");
    }

    function cleanupUI() {
      if (exitButton) exitButton.remove();
      if (upgradeButton) upgradeButton.remove();
    }

    function createUpgradeOverlay() {
      // semi-transparent overlay
      const overlay = p.createDiv('');
      overlay.position(0, 0);
      overlay.size(p.width, p.height);
      overlay.style('background-color', 'rgba(0, 0, 0, 0.8)');
      overlay.style('position', 'fixed');
      overlay.style('z-index', '1000');

      // create upgrade container
      const upgradeContainer = p.createDiv('');
      upgradeContainer.position(p.width / 2 - 400, p.height / 2 - 300);
      upgradeContainer.size(800, 600);
      upgradeContainer.style('background-color', 'rgba(50, 50, 70, 0.95)');
      upgradeContainer.style('border', '2px solid #FFFFFF');
      upgradeContainer.style('border-radius', '15px');
      upgradeContainer.style('padding', '20px');
      upgradeContainer.style('z-index', '1001');

      // headers for each category
      const categories = ['RODS', 'BOATS', 'BAITS'];
      const headers = categories.map((cat, i) => {
        const header = p.createDiv(cat);
        header.position(p.width / 2 - 250 + (i * 250), p.height / 2 - 250);
        header.style('font-family', "'Pirata One', cursive");
        header.style('font-size', '36px');
        header.style('color', '#FFFFFF');
        header.style('text-align', 'center');
        header.style('z-index', '1002');
        return header;
      });

      const lineHeight = 550;
      const lineY = p.height / 2 - 250;

      // first line
      const separator1 = p.createDiv('');
      separator1.position(p.width / 2 - 90, lineY);
      separator1.style('width', '2px');
      separator1.style('height', `${lineHeight}px`);
      separator1.style('background-color', '#FFFFFF');
      separator1.style('opacity', '0.3');
      separator1.style('z-index', '1002');

      // second line
      const separator2 = p.createDiv('');
      separator2.position(p.width / 2 + 160, lineY);
      separator2.style('width', '2px');
      separator2.style('height', `${lineHeight}px`);
      separator2.style('background-color', '#FFFFFF');
      separator2.style('opacity', '0.3');
      separator2.style('z-index', '1002');

      // image buttons
      createImageButtons(rodImages, 0);
      createImageButtons(boatImages, 1);
      createImageButtons(baitImages, 2);

      // close button
      closeButton = p.createButton('✕');
      closeButton.position(p.width / 2 + 400, p.height / 2 - 290);
      closeButton.style('background-color', 'transparent');
      closeButton.style('color', 'white');
      closeButton.style('border', 'none');
      closeButton.style('font-size', '24px');
      closeButton.style('cursor', 'pointer');
      closeButton.style('z-index', '1002');
      closeButton.mousePressed(closeUpgradeOverlay);
    }

    function createImageButtons(images, columnIndex) {
      const type = columnIndex === 0 ? 'rod' : columnIndex === 1 ? 'boat' : 'bait';

      images.forEach((img, i) => {
        const container = p.createDiv('');
        container.position(
          p.width / 2 - 265 + (columnIndex * 250),
          p.height / 2 - 150 + (i * 150)
        );
        container.size(100, 120);
        container.style('z-index', '1002');

        const btn = p.createButton('');
        btn.parent(container);
        btn.size(100, 100);
        btn.style('background-image', `url(${img.canvas.toDataURL()})`);
        btn.style('background-size', 'contain');
        btn.style('background-repeat', 'no-repeat');
        btn.style('background-position', 'center');
        btn.style('background-color', 'transparent');
        btn.style('border', '2px solid #FFFFFF');
        btn.style('border-radius', '8px');
        btn.style('cursor', 'pointer');

        // equipped indicator
        if (gameState.equippedItems[type] === i) {
          btn.style('border', '2px solid #00ff00');
        }

        // price tag if not unlocked
        if (!gameState.unlockedItems[type][i] && i > 0) {
          const costLabel = p.createDiv(`${UPGRADE_COSTS[type][i]} coins`);
          costLabel.parent(container);
          costLabel.style('color', coins >= UPGRADE_COSTS[type][i] ? '#00ff00' : '#ff0000');
          costLabel.style('text-align', 'center');
          costLabel.style('font-family', "'Pirata One', cursive");
          costLabel.style('font-size', '16px');
        }

        btn.mousePressed(() => {
          if (gameState.unlockedItems[type][i]) {
            // already unlocked and equippable
            gameState.equippedItems[type] = i;
            updateEquipmentVisuals();
            saveGameState();
          } else if (coins >= UPGRADE_COSTS[type][i]) {
            // can be unlockable with enough coins
            coins -= UPGRADE_COSTS[type][i];
            gameState.unlockedItems[type][i] = true;
            gameState.equippedItems[type] = i;
            updateEquipmentVisuals();
            saveGameState();
          }
        });
      });
    }

    function closeUpgradeOverlay() {
      isUpgradeOpen = false;
      closeButton.remove();
      const elements = document.querySelectorAll('div, button');
      elements.forEach(element => {
        if (element.style.zIndex >= 1000) {
          element.remove();
        }
      });
    }

    function updateEquipmentVisuals() {
      const elements = document.querySelectorAll('div');
      elements.forEach(element => {
        if (element.style.zIndex >= 1000) {
          element.remove();
        }
      });

      if (isUpgradeOpen) {
        createUpgradeOverlay(); // Only recreate if it's supposed to be open
      }
    }

    function getEquipmentBonus() {
      const rodBonus = gameState.equippedItems.rod * 0.5;
      const boatBonus = gameState.equippedItems.boat * 0.3;
      const baitBonus = gameState.equippedItems.bait * 0.2;

      return rodBonus + boatBonus + baitBonus;
    }

    function saveGameState() {

      const cleanedInventory = gameState.fishInventory.map(fish => ({
        species: fish.species,
        rarity: fish.rarity,
        base_value: fish.base_value,
        icon: fish.icon
      }));

      const saveData = {
        coins: coins,
        equippedItems: gameState.equippedItems,
        unlockedItems: gameState.unlockedItems,
        fishInventory: cleanedInventory
      };
      localStorage.setItem('gameState', JSON.stringify(saveData));
    }

    function loadGameState() {
      const savedData = localStorage.getItem('gameState');
      if (savedData) {
        const data = JSON.parse(savedData);
        coins = data.coins;
        gameState.equippedItems = data.equippedItems;
        gameState.unlockedItems = data.unlockedItems;
        gameState.fishInventory = data.fishInventory.map(f => {
          const fullData = catchableItems.find(item => item.species === f.species);
          return {
            ...f,
            img: fullData?.img // Restore image from preloaded assets
          };
        });
      }
    }

    function resetGameState() {
      const initialState = {
        coins: 0,
        equippedItems: {
          rod: 0,
          boat: 0,
          bait: 0
        },
        unlockedItems: {
          rod: [true, false, false],
          boat: [true, false, false],
          bait: [true, false, false]
        },
        fishInventory: []
      };
    
      localStorage.setItem('gameState', JSON.stringify(initialState));
    
      // Reset local variables too
      coins = 0;
      gameState.equippedItems = initialState.equippedItems;
      gameState.unlockedItems = initialState.unlockedItems;
      gameState.fishInventory = [];
    
      isUpgradeOpen = false;
      if (typeof closeUpgradeOverlay === 'function') {
        closeUpgradeOverlay();
      }
    
      updateEquipmentVisuals(); // This redraws the equipment visually
      saveGameState(); // Ensure new state is saved
    }

    const BAIT_RARITY_CHANCES = [
      { Common: 0.6, Uncommon: 0.25, Rare: 0.1, Legendary: 0.05 },  // Basic bait
      { Common: 0.4, Uncommon: 0.3, Rare: 0.2, Legendary: 0.1 },    // Advanced bait
      { Common: 0.25, Uncommon: 0.35, Rare: 0.25, Legendary: 0.15 } // Premium bait
    ];

    //Helper function for reeling phase.
    function getRandomFishByRarity() {
      const baitLevel = gameState.equippedItems.bait;
      const chances = BAIT_RARITY_CHANCES[baitLevel];
      const roll = Math.random();
      let threshold = 0;

      for (const rarity of ['Common', 'Uncommon', 'Rare', 'Legendary']) {
        threshold += chances[rarity];
        if (roll < threshold) {
          const fishList = catchableItems.filter(f => f.rarity === rarity);
          return fishList[Math.floor(Math.random() * fishList.length)];
        }
      }

      /*

      if (roll < 0.5) { // 50% Common
        const commons = catchableItems.filter(f => f.rarity === 'Common');
        return commons[Math.floor(Math.random() * commons.length)];
      } else if (roll < 0.75) { // 25% Uncommon
        const uncommons = catchableItems.filter(f => f.rarity === 'Uncommon');
        return uncommons[Math.floor(Math.random() * uncommons.length)];
      } else if (roll < 0.90) { // 15% Rare
        const rares = catchableItems.filter(f => f.rarity === 'Rare');
        return rares[Math.floor(Math.random() * rares.length)];
      } else { // 10% Legendary
        const legendaries = catchableItems.filter(f => f.rarity === 'Legendary');
        return legendaries[Math.floor(Math.random() * legendaries.length)];
      }
      */

      // Fallback
      return catchableItems.find(f => f.species === 'Old Boot');
    } 

    //-------------------------------------THEMES-----------------------------------------------

    function drawGlowingLights(p) {
      if (!window.krakenLights) {
        window.krakenLights = [];
        for (let i = 0; i < 15; i++) { 
          krakenLights.push({
            x: p.random(p.width),
            y: p.random(seaTop * 0.5, seaTop + 100), 
            size: p.random(6, 12),
            speed: p.random(0.2, 0.5),
            angle: p.random(p.TWO_PI),
            brightness: p.random(100, 200)
          });
        }
      }
    
      // Draw and animate lights
      p.blendMode(p.ADD); 
      krakenLights.forEach(light => {
        light.x += p.cos(light.angle) * 0.3;
        light.y += p.sin(light.angle) * light.speed;
        light.angle += p.random(-0.05, 0.05);

        if (light.x < 0) light.x = p.width;
        if (light.x > p.width) light.x = 0;
        if (light.y < 0) light.y = seaTop + 50;

        const pulse = p.sin(p.frameCount * 0.05 + light.x) * 30 + light.brightness;
        p.fill(255, 200, 100, pulse * 0.7); 
        p.ellipse(light.x, light.y, light.size * 1.5);
        p.fill(255, 240, 180, pulse * 0.4); 
        p.ellipse(light.x, light.y, light.size * 0.7);
      });
      p.blendMode(p.BLEND); 
    }

    function drawTortugaEffects(p) {
      if (!window.tortugaLeaves) {
        window.tortugaLeaves = [];
        for (let i = 0; i < 8; i++) {
          tortugaLeaves.push({
            x: p.random(p.width),
            y: p.random(seaTop - 100, seaTop),
            size: p.random(30, 60),
            speed: p.random(0.3, 0.7),
            rotation: p.random(p.TWO_PI),
            rotSpeed: p.random(-0.01, 0.01)
          });
        }
      }
    
    
      // Floating leaves
      p.blendMode(p.BLEND);
      tortugaLeaves.forEach(leaf => {
        leaf.x -= leaf.speed;
        leaf.y += p.sin(p.frameCount * 0.03) * 0.5;
        leaf.rotation += leaf.rotSpeed;
        
        p.push();
        p.translate(leaf.x, leaf.y);
        p.rotate(leaf.rotation);
        p.fill(30, 120, 40, 180);
        p.ellipse(0, 0, leaf.size, leaf.size * 0.3);
        p.pop();
        
        if (leaf.x < -50) leaf.x = p.width + 50;
      });
    }

    function drawSkeletonEffects(p) {
      if (!window.boneParticles) {
        window.boneParticles = [];
        for (let i = 0; i < 20; i++) {
          boneParticles.push({
            x: p.random(p.width),
            y: p.random(seaTop, p.height),
            size: p.random(10, 25),
            speedX: p.random(-0.2, 0.2),
            speedY: p.random(-0.1, 0.1),
            life: p.random(100, 200)
          });
        }
      }
    
      p.blendMode(p.LIGHTEST);
      p.fill(150, 180, 200, 15);
      p.rect(0, seaTop - 50, p.width, p.height);
      p.blendMode(p.BLEND);

      boneParticles.forEach(bone => {
        bone.x += bone.speedX + p.sin(p.frameCount * 0.05 + bone.y) * 0.3;
        bone.y += bone.speedY;
        bone.life--;
        
        p.fill(240, 240, 230, bone.life);
        p.ellipse(bone.x, bone.y, bone.size * 0.8, bone.size * 0.3);
        p.ellipse(bone.x + bone.size * 0.3, bone.y, bone.size * 0.5, bone.size * 0.2);
        
        if (bone.life < 0 || bone.y > p.height + 50) {
          bone.x = p.random(p.width);
          bone.y = p.random(seaTop, seaTop + 100);
          bone.life = p.random(100, 200);
        }
      });
    }

  };
}