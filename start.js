import { initMapScreen } from './map.js';
import { audioManager } from './play.js';

export function initStartScreen(switchTo) {
  return (p) => {
    let img, title;
    let startButton, setButton, quitButton, settingsPopup;
    let sfxSlider, musicSlider, languageSelect, backButton;
    let isSettingsOpen = false;

    p.preload = () => {
      img = p.loadImage("images/catchFish.png");
    };

    p.setup = () => {
      p.createCanvas(p.windowWidth, p.windowHeight);

      title = p.createDiv('Hook and Tackle');
      title.style('font-family', "'Pirata One', cursive");
      title.style('font-size', '64px');
      title.style('color', '#FFFFFF');
      title.style('text-align', 'center');
      title.position(p.width / 2 - 200, p.height / 2 - 200);
      title.style('width', '400px');

      startButton = makeButton("Start", p.width / 2 - 75, p.height / 2 - 75, "#28a745", () => {
        cleanupUI();
        p.remove();
        switchTo(initMapScreen(switchTo));
      });

      setButton = makeButton("Settings", p.width / 2 - 75, p.height / 2, "grey", () => openSettings(p));
      quitButton = makeButton("Quit", p.width / 2 - 75, p.height / 2 + 75, "red", () => window.close());

      audioManager.playIntroMusic();
    };

    p.draw = () => {
      p.background(20);
      p.image(img, 0, 0, p.width, p.height);
    };

    p.windowResized = () => {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
      title.position(p.width / 2 - 200, p.height / 2 - 200);
      startButton.position(p.width / 2 - 75, p.height / 2 - 75);
      setButton.position(p.width / 2 - 75, p.height / 2);
      quitButton.position(p.width / 2 - 75, p.height / 2 + 75);
      if (isSettingsOpen) {
        settingsPopup.position(p.width / 2 - 200, p.height / 2 - 200);
      }
      
    };

    function makeButton(label, x, y, color, action) {
      const btn = p.createButton(label);
      btn.position(x, y);
      btn.size(150, 50);
      btn.style("font-family", "'Pirata One', cursive");
      btn.style("font-size", "28px");
      btn.style("background-color", color);
      btn.style("color", "#FFFFFF");
      btn.style("border", "none");
      btn.style("border-radius", "12px");
      btn.style("box-shadow", "0px 4px 10px rgba(0, 0, 0, 0.2)");
      btn.style("font-weight", "bold");
      btn.style("cursor", "pointer");
      btn.mousePressed(action);
      return btn;
    }

    function openSettings(p) {
      if (isSettingsOpen) return;
      isSettingsOpen = true;

      settingsPopup = p.createDiv('');
      settingsPopup.position(p.width / 2 - 200, p.height / 2 - 200);
      settingsPopup.size(400, 400);
      settingsPopup.style('background-color', 'rgba(0, 0, 0, 0.9)');
      settingsPopup.style('border', '2px solid #FFFFFF');
      settingsPopup.style('border-radius', '15px');
      settingsPopup.style('padding', '20px');

      const makeLabel = (text) => {
        const label = p.createDiv(text);
        label.parent(settingsPopup);
        label.style("font-family", "'Pirata One', cursive");
        label.style("font-size", "24px");
        label.style('color', '#FFFFFF');
        label.style('margin', '10px 0');
        return label;
      };

      p.createDiv("Settings").parent(settingsPopup).style('font-size', '48px').style('color', '#fff').style('text-align', 'center').style("font-family", "'Pirata One', cursive");

      makeLabel("Sound Effects Volume");
      sfxSlider = p.createSlider(0, 100, 100);
      sfxSlider.parent(settingsPopup);
      sfxSlider.style('width', '100%');

      makeLabel("Music Volume");
      const savedVolume = parseInt(localStorage.getItem("musicVolume")) || 100;
      audioManager.setVolume(savedVolume);
      musicSlider = p.createSlider(0, 100, savedVolume);
      musicSlider.parent(settingsPopup);
      musicSlider.style('width', '100%');
      // actual functionality
      musicSlider.input(() => {
        audioManager.setVolume(musicSlider.value());
      });

      makeLabel("Language");
      languageSelect = p.createSelect();
      languageSelect.parent(settingsPopup);
      languageSelect.style('font-family', "'Pirata One', cursive");
      languageSelect.style('font-size', '20px');
      languageSelect.style('width', '100%');
      languageSelect.style('padding', '5px');
      languageSelect.style('margin-bottom', '30px');
      ['English', 'Español', 'Português', 'Français', '中文', 'Русский'].forEach(lang => languageSelect.option(lang));

      backButton = p.createButton('BACK');
      backButton.parent(settingsPopup);
      backButton.size(150, 50);
      backButton.style('position', 'absolute');
      backButton.style('bottom', '20px');
      backButton.style('left', '50%');
      backButton.style('transform', 'translateX(-50%)');
      backButton.style('font-family', "'Pirata One', cursive");
      backButton.style('font-size', '28px');
      backButton.style('background-color', '#dc3545');
      backButton.style('color', '#FFFFFF');
      backButton.style('border', 'none');
      backButton.style('border-radius', '12px');
      backButton.style('cursor', 'pointer');
      backButton.mousePressed(closeSettings);
    }

    function closeSettings() {
      if (!isSettingsOpen) return;
      settingsPopup.remove();
      backButton.remove();
      isSettingsOpen = false;
    }

    function cleanupUI() {
      startButton.remove();
      setButton.remove();
      quitButton.remove();
      title.remove();
      if (isSettingsOpen) closeSettings();
    }
  };
}

