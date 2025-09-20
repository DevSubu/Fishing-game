import { initPlayScreen } from './play.js';
import { initStartScreen } from './start.js';
import { audioManager } from './play.js';

export function initMapScreen(switchTo) {
  return (p) => {
    let maps;
    let playButton;
    let backButton, switchMapButton, upgradeButton, startButton;
    let boatImg, fishermanImg;
    let mapIndex = parseInt(localStorage.getItem("selectedMapIndex")) || 0;
    let playerX = 100;
    let dx = 2;
    let facingRight = false;
  
    const mapThemes = [
      {
        name: 'Tortuga Bay',
        oceanColor: [50, 150, 200],
        boatColor: '#8B4513',
        islandColor: '#228B22',
        decorations: (p) => {
          drawSand(p);
          drawPalm(p, 130, p.height - 110);
          drawPalm(p, p.width - 120, p.height - 130);
          drawWaves(p);
          drawTreasure(p);
        }
      },
      {
        name: 'Kraken Cove',
        oceanColor: [45, 60, 90],
        boatColor: '#3A3F44',
        islandColor: '#303030',
        decorations: (p) => {
          drawSand(p);
          drawPalm(p, 160, p.height - 100);
          drawPalm(p, p.width - 160, p.height - 110);
          for (let i = 0; i < 5; i++) {
            p.fill(255, 255, 255, 15);
            p.ellipse(p.width / 2 + i * 60, p.height / 2 + 40 + p.sin(p.frameCount * 0.01 + i) * 20, 150, 40);
          }
          for (let i = 0; i < 3; i++) {
            p.fill(40, 40, 60, 120);
            let tentacleX = 200 + i * 180;
            let tentacleY = p.height - 100 + p.sin(p.frameCount * 0.05 + i) * 15;
            p.ellipse(tentacleX, tentacleY, 20, 100);
          }
          for (let i = 0; i < 2; i++) {
            p.fill(255, 223, 100, 80);
            p.ellipse(100 + i * (p.width - 200), p.height - 90, 40, 40);
            p.fill(255, 255, 200);
            p.ellipse(100 + i * (p.width - 200), p.height - 90, 10, 10);
          }
        }
      },
      {
        name: 'Skeleton Atoll',
        oceanColor: [40, 60, 70],
        boatColor: '#DAA520',
        islandColor: '#A9A9A9',
        decorations: (p) => {
          drawSand(p);
          drawPalm(p, 130, p.height - 110);
          drawPalm(p, p.width - 120, p.height - 130);
          drawSkeletonEffects(p);
        }
      }
    ];

    const mapEmojis = {
      'Tortuga Bay': '🌴',
      'Kraken Cove': '🦑',
      'Skeleton Atoll': '💀'
    };


    p.preload = () => {
      boatImg = p.loadImage("images/boat-without-mast-hi.png");
      fishermanImg = p.loadImage("images/fisherman.png");
    };

    p.setup = () => {
      p.createCanvas(p.windowWidth, p.windowHeight);

      const theme = mapThemes[mapIndex];
      audioManager.playMapMusic(theme.name);

      backButton = p.createButton('⬅ Back to Menu');
      backButton.size(160, 40);
      backButton.style('font-size', '16px');
      backButton.style("font-family", "'Pirata One', cursive");
      backButton.position(20, 20);
      backButton.mousePressed(() => {
        cleanup();
        p.remove();
        switchTo(initStartScreen(switchTo));
        audioManager.playIntroMusic();
      });

      playButton = p.createButton("🏴‍☠️ Start Game");
      playButton.position(p.width / 2 - 100, p.height / 2 - 40);
      playButton.size(200, 60);
      styleButton(playButton, "#28a745");
      playButton.mousePressed(() => {
        cleanup();
        p.remove();
        switchTo(initPlayScreen(switchTo));
      });

      switchMapButton = p.createButton('🗺 Change Map');
      switchMapButton.size(160, 40);
      styleButton(switchMapButton, "#328da8");
      switchMapButton.position(200, 20);
      switchMapButton.mousePressed(() => {
        mapIndex = (mapIndex + 1) % mapThemes.length;
        localStorage.setItem("selectedMapIndex", mapIndex);
        // play corresponding music when map changes
        audioManager.playMapMusic(mapThemes[mapIndex].name);
      });
    };

    p.draw = () => {
      const theme = mapThemes[mapIndex];
      drawPirateOcean(theme);

      p.fill(255, 200, 0);
      p.imageMode(p.CENTER);
      p.push();
      p.translate(playerX, p.height / 4);
      if (!facingRight) {
        p.scale(-1, 1);
      }
      p.image(boatImg, 0, 0, 200, 60);
      p.image(fishermanImg, 0, -50, 80, 100);
      p.pop();

      playerX += dx;
      if (playerX > p.width - 100) {
        playerX = p.width - 100;
        dx *= -1;
        facingRight = true;
      } else if (playerX < 100) {
        playerX = 100;
        dx *= -1;
        facingRight = false;
      }

      p.fill(255);
      p.textSize(24);
      p.textAlign(p.CENTER);
      p.text(`${mapEmojis[theme.name]} ${theme.name}`, p.width / 2, 40);
    };

    function drawPirateOcean(theme) {
      p.background(...theme.oceanColor);
      p.noStroke();

      for (let y = 0; y < p.height; y += 40) {
        for (let x = 0; x < p.width; x += 80) {
          p.fill(255, 255, 255, 30);
          p.ellipse(x + (p.sin(p.frameCount * 0.05 + x * 0.01) * 20), y, 100, 20);
        }
      }

      p.fill(theme.islandColor);
      p.ellipse(p.width - 100, p.height - 100, 150, 100);
      p.ellipse(150, p.height - 80, 120, 80);

      if (theme.decorations) {
        theme.decorations(p);
      }
    }

    function drawPalm(p, x, y) {
      p.stroke(139, 69, 19);
      p.strokeWeight(6);
      p.line(x, y, x, y - 50);
      p.noStroke();
      p.fill(34, 139, 34);
      for (let a = 0; a < 360; a += 60) {
        const rad = p.radians(a);
        p.ellipse(x + Math.cos(rad) * 15, y - 50 + Math.sin(rad) * 15, 20, 10);
      }
    }

    function drawSand(p) {
      const sandHeight = 60;
      p.noStroke();
      for (let i = 0; i < 10; i++) {
        p.fill(237, 201, 175, 150 - i * 10);
        p.rect(0, p.height - sandHeight + i * 6, p.width, 6);
      }
    }

    function drawWaves(p) {
      p.noFill();
      p.stroke(255, 255, 255, 80);
      p.strokeWeight(1.5);
      for (let i = 0; i < p.width; i += 30) {
        const yOffset = p.sin(p.frameCount * 0.1 + i * 0.05) * 4;
        p.line(i, p.height - 70 + yOffset, i + 15, p.height - 75 + yOffset);
      }
    }

    function drawTreasure(p) {
      p.fill(194, 178, 128);
      const chestX = p.width / 2;
      const chestY = p.height - 60 + p.sin(p.frameCount * 0.1) * 3;
      p.rect(chestX - 15, chestY, 30, 20, 5);
      p.fill(255, 215, 0);
      p.ellipse(chestX, chestY, 8, 8);
    }

    function cleanup() {
      if (backButton) backButton.remove();
      if (switchMapButton) switchMapButton.remove();
      if (upgradeButton) upgradeButton.remove();
      if (startButton) startButton.remove();
    }

    function styleButton(btn, bgColor) {
      btn.style("font-family", "'Pirata One', cursive");
      btn.style("font-size", "22px");
      btn.style("background-color", bgColor);
      btn.style("color", "#FFFFFF");
      btn.style("border", "none");
      btn.style("border-radius", "12px");
      btn.style("box-shadow", "0px 4px 10px rgba(0, 0, 0, 0.2)");
      btn.style("font-weight", "bold");
      btn.style("cursor", "pointer");
    }

    function drawSkeletonEffects(p) {
      p.blendMode(p.LIGHTEST);
      p.fill(180, 190, 210, 8);
      p.rect(0, p.height * 0.3, p.width, p.height * 0.7);
      p.blendMode(p.BLEND);

      if (!window.skeletonParticles) {
        window.skeletonParticles = [];
        const skeletonImg = p.loadImage("catchable_items/sprites/map_bones.png");
        
        for (let i = 0; i < 6; i++) { 
          skeletonParticles.push({
            x: p.random(p.width),
            y: p.random(p.height * 0.4, p.height - 50),
            size: p.random(40, 70),
            speed: p.random(0.2, 0.4),
            img: skeletonImg,
            angle: 0
          });
        }
      }
    
      // Draw skeletons
      skeletonParticles.forEach(s => {
        p.push();
        p.translate(s.x, s.y);
        p.rotate(p.sin(p.frameCount * 0.02 + s.x) * 0.1); 
        p.imageMode(p.CENTER);
        p.image(s.img, 0, 0, s.size, s.size * 1.2); 
        p.pop();
    
        s.x += s.speed;
        if (s.x > p.width + 50) s.x = -50;
      });
    
      p.noStroke();
      for (let i = 0; i < 3; i++) {
        p.fill(220, 220, 210, 180);
        const boneX = 70 + i * (p.width / 3);
        p.ellipse(boneX, p.height - 40, 30, 10);
        p.ellipse(boneX + 15, p.height - 42, 15, 5);
      }
    }
    
  };
}
