const EventHandler = {
  eventCount: 0,
  escCount: 0,
  visible: true,
  escMultiplicator: navigator.platform.includes('Mac') ? 8 : 3,
  inLanscape: false,
  init: () => {
    document.addEventListener(
      'pointerlockchange',
      CursorHandler.changeCallback,
      false
    );
    document.addEventListener(
      'pointerlockerror',
      CursorHandler.errorCallback,
      false
    );

    commonView.videoElement.addEventListener('click', () => {
      if (CursorHandler.cursorState === 1 && !SYSTEM_STATS.IS_MOBILE) {
        EventHandler.resetEscape();
        if (SYSTEM_STATS.IS_CHROMIUM) {
          document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreen) EventHandler.release();
          });
          document.addEventListener('fullscreenerror', () =>
            Log.e('Fullscreen error')
          );

          navigator.keyboard?.lock([
            'KeyW',
            'KeyA',
            'KeyJ',
            'KeyB',
            'KeyN',
            'KeyG',
            'KeyT',
            'KeyD',
            'F11',
            'F3',
            'F1',
            'Tab',
            'Escape',
            'Space'
          ]);
        }
        EventHandler.initKeyboardAndMouse();
      }
    });
    setTimeout(() => {
      window.addEventListener('gamepadconnected', EventHandler.addController);
      window.addEventListener(
        'gamepaddisconnected',
        EventHandler.removeController
      );
      GamepadController.scangamepads();
    }, 2000);

    window.addEventListener('focus', (event) => {
      SessionHandler.sendEvents({
        type: 'stream',
        action: 'page',
        is_visible: true,
        is_focus: true
      });
    });

    window.addEventListener('blur', (event) => {
      SessionHandler.sendEvents({
        type: 'stream',
        action: 'page',
        is_visible: true,
        is_focus: false
      });
      EventHandler.release();
    });
  },
  initKeyboardAndMouse: () => {
    Log.v('Init events');
    EventHandler.escCount = 0;
    commonView.audioElement.paused && commonView.audioElement.play();
    SessionHandler.sendEvents({ type: 'cursor', action: 'missed' });
    SessionHandler.sendEvents({
      type: 'mouse',
      action: 'connected',
      LeftBtnState: false,
      MiddleBtnState: false,
      RightBtnState: false
    });
    SessionHandler.sendEvents({
      type: 'keyboard',
      action: 'connected',
      LShiftBtnState: false,
      RShiftBtnState: false,
      LAltBtnState: false,
      RAltBtnState: false,
      LCtrlBtnState: false,
      RCtrlBtnState: false
    });

    commonView.videoElement.addEventListener(
      'mousemove',
      EventHandler.updatePosition,
      false
    );
    commonView.videoElement.addEventListener(
      'mousedown',
      EventHandler.getMouseButtonEvent,
      false
    );
    commonView.videoElement.addEventListener(
      'mouseup',
      EventHandler.getMouseButtonEvent,
      false
    );
    commonView.videoElement.addEventListener(
      'wheel',
      EventHandler.getScrollEvent,
      { passive: true }
    );
    commonView.videoElement.addEventListener(
      'visibilitychange',
      EventHandler.getVisibilityChangeEvent,
      false
    );
    commonView.videoElement.addEventListener('contextmenu', (e) => {
      CursorHandler.cursorState > 1 && e.preventDefault();
    });

    document.addEventListener(
      'keyup',
      EventHandler.getKeyBoardButtonEvent,
      false
    );
    document.addEventListener(
      'keydown',
      EventHandler.getKeyBoardButtonEvent,
      false
    );

    CursorHandler.cursorState =
      CursorHandler.lastCursorState > 0 ? CursorHandler.lastCursorState : 2;
    if (CursorHandler.lastCursorIconName)
      CursorHandler.changeSessionCursor(CursorHandler.lastCursorIconName);

    !SYSTEM_STATS.IS_MOBILE && commonView.toggleControls();
  },
  addController: (e) => GamepadController.addgamepad(e.gamepad),
  removeController: (e) => GamepadController.removegamepad(e.gamepad),
  releaseController: () => {
    window.removeEventListener('gamepadconnected', EventHandler.addController);
    window.removeEventListener(
      'gamepaddisconnected',
      EventHandler.removeController
    );
  },
  updatePosition: (event) => {
    event = event || window.event;
    if (
      CursorHandler.cursorState === 3 &&
      !CursorHandler.isLocked() &&
      !SYSTEM_STATS.IS_MOBILE
    )
      return;
    let typeOfControl = SYSTEM_STATS.IS_MOBILE ? 'touchscreen' : 'mouse';
    const mouseData = {
      type: typeOfControl,
      action: 'move',
      X: event.offsetX / commonView.videoElement.clientWidth,
      Y: event.offsetY / commonView.videoElement.clientHeight,
      offsetX: parseInt(event.movementX),
      offsetY: parseInt(event.movementY),
      isVisible: CursorHandler.cursorState === 2
    };
    if (CursorHandler.cursorState != 1) {
      EventHandler.sendRttEvent(mouseData);
    }
  },
  getMouseButtonEvent: (event) => {
    event = event || window.event;
    if ('object' !== typeof event) return;
    event.preventDefault();
    let pressedStatus = event.type === 'mousedown';
    if (
      CursorHandler.cursorState === 3 &&
      !CursorHandler.isLocked() &&
      pressedStatus &&
      !SYSTEM_STATS.IS_MOBILE
    ) {
      commonView.videoElement.requestPointerLock();
      return;
    }
    let data = {
      type: 'mouse',
      action: 'button',
      isPressed: pressedStatus
    };
    data.btn = event.button;
    if (CursorHandler.cursorState != 1) EventHandler.sendRttEvent(data);
  },
  getVirtualButtonEvent: (event) => {
    const btnIndex = event.target.id === 'virtual_btn_menu' ? 7 : 6;
    //const val = (event.type === 'mousedown')?1:0;
    let gIndex = null;
    for (let index in GamepadController.ids) {
      if (GamepadController.ids[+index]) {
        gIndex = GamepadController.ids[+index];
        break;
      }
    }
    if (gIndex) {
      GamepadController.sendButtonEvent(btnIndex, 1, gIndex);
      setTimeout(
        () => GamepadController.sendButtonEvent(btnIndex, 0, gIndex),
        150
      );
    }
  },
  getScrollEvent: (event) => {
    EventHandler.sendRttEvent({
      type: 'mouse',
      action: 'wheel',
      deltaY: Math.sign(event.deltaY)
    });
  },
  getKeyBoardButtonEvent: (event) => {
    event = event || window.event;
    if ('object' !== typeof event) return;
    event.preventDefault();

    let pressedStatus = event.type === 'keydown';
    // Show top control panel
    if (event.ctrlKey && event.altKey && !SYSTEM_STATS.IS_CHROMIUM) {
      EventHandler.release();
    } else {
      let btnCode = event.which || event.key || event.keyCode;
      // Firefox sends "non-standard" keyCodes for +-; https://github.com/ccampbell/mousetrap/pull/215
      //left window key
      if (btnCode === 91) {
        return;
      } else if (
        navigator.userAgent.indexOf('Firefox') !== -1 &&
        btnCode === 173
      ) {
        btnCode = 189;
      } else if (
        navigator.userAgent.indexOf('Firefox') !== -1 &&
        btnCode === 61
      ) {
        btnCode = 187;
      } else if (
        navigator.userAgent.indexOf('Firefox') !== -1 &&
        btnCode === 59
      ) {
        btnCode = 186;
      } else if (btnCode === 16) {
        //left, right shift
        btnCode = event.location === 1 ? 0xa0 : 0xa1;
      } else if (btnCode === 17) {
        //left, right ctrl
        btnCode = event.location === 1 ? 0xa2 : 0xa3;
      } else if (btnCode === 18) {
        //left, right alt
        btnCode = event.location === 1 ? 0xa4 : 0xa5;
      }
      //press esc many time
      if (
        SYSTEM_STATS.IS_CHROMIUM &&
        CursorHandler.cursorState > 1 &&
        btnCode === 27
      ) {
        setTimeout(() => {
          if (EventHandler.escCount === 0) {
            EventHandler.sendRttEvent({
              type: 'keyboard',
              action: 'button',
              isPressed: true,
              code: 27
            });
            setTimeout(
              () =>
                EventHandler.sendRttEvent({
                  type: 'keyboard',
                  action: 'button',
                  isPressed: false,
                  code: 27
                }),
              50
            );
          }
        }, 40);
        if (pressedStatus) {
          EventHandler.escCount++;
          if (EventHandler.escCount > 1) {
            commonView.toggleEscapeProgress(true);
            let progress =
              EventHandler.escCount * EventHandler.escMultiplicator;
            if (progress < 100) {
              commonView.updateEscapeProgress(progress);
            } else {
              EventHandler.resetEscape();
            }
          }
        } else {
          EventHandler.escCount = 0;
          EventHandler.resetEscape();
        }
        return;
      }
      var iBtnCode = parseInt(btnCode);
      if (Number.isInteger(iBtnCode) && CursorHandler.cursorState > 1) {
        EventHandler.sendRttEvent({
          type: 'keyboard',
          action: 'button',
          isPressed: pressedStatus,
          code: iBtnCode
        });
      }
    }
  },
  resetEscape: () => {
    commonView.toggleEscapeProgress(false);
  },
  release: () => {
    if (!SYSTEM_STATS.IS_MOBILE) {
      commonView.toggleEscapeProgress(false);
      CursorHandler.cursorState = 1;
      commonView.toggleControls();

      CursorHandler.changeSessionCursor('default');
      document.exitPointerLock();
      document.removeEventListener(
        'keyup',
        EventHandler.getKeyBoardButtonEvent,
        false
      );
      document.removeEventListener(
        'keydown',
        EventHandler.getKeyBoardButtonEvent,
        false
      );
      document.removeEventListener(
        'mouseup',
        EventHandler.getMouseButtonEvent,
        false
      );
      document.removeEventListener(
        'mousedown',
        EventHandler.getMouseButtonEvent,
        false
      );
      commonView.videoElement.removeEventListener(
        'mousemove',
        EventHandler.updatePosition,
        false
      );
      commonView.videoElement.removeEventListener(
        'wheel',
        EventHandler.getScrollEvent,
        false
      );
      commonView.videoElement.removeEventListener(
        'visibilitychange',
        EventHandler.getVisibilityChangeEvent,
        false
      );
    }
  },
  getVisibilityChangeEvent: () => {
    !SYSTEM_STATS.IS_MOBILE && EventHandler.initKeyboardAndMouse();
  },
  sendRttEvent: (data) => {
    EventHandler.eventCount++;
    if (EventHandler.eventCount > 19) {
      data.time = new Date().getTime();
      EventHandler.eventCount = 0;
    }
    SessionHandler.sendEvents(data);
  }
};

const VirtualController = {
  isVisible: false,
  leftAxis: null,
  rightAxis: null,
  name: 'Boosteroid virtual controller',
  controllerId: null,
  instance: document.getElementById('virtual_controller'),
  connect: (message) => {
    VirtualController.controllerId = message.id;
    VirtualController.instance.style.display = 'block';
    VirtualController.isVisible = true;
  },
  init: () => {
    SessionHandler.sendEvents({
      type: 'controller',
      action: 'connected',
      name: VirtualController.name
    });
    VirtualController.instance.addEventListener(
      'touchstart',
      VirtualController.touch,
      false
    );
    VirtualController.instance.addEventListener(
      'touchend',
      VirtualController.untouch,
      false
    );
    VirtualController.instance.addEventListener(
      'touchcancel',
      VirtualController.untouch,
      false
    );
    VirtualController.initAxis();
  },
  release: () => {
    VirtualController.instance.style.display = 'none';
    VirtualController.isVisible = false;
    VirtualController.controllerId &&
      SessionHandler.sendEvents({
        type: 'controller',
        action: 'disconnected',
        id: VirtualController.controllerId
      });
    VirtualController.instance.removeEventListener(
      'touchstart',
      VirtualController.touch,
      false
    );
    VirtualController.instance.removeEventListener(
      'touchend',
      VirtualController.untouch,
      false
    );
    VirtualController.instance.removeEventListener(
      'touchcancel',
      VirtualController.untouch,
      false
    );
    VirtualController.releaseAxis();
  },
  initAxis: () => {
    let lsConf, rsConf;
    if (window.orientation === 0 || window.orientation === 180) {
      lsConf = { id: 'ls', width: 74, height: 74, fontSize: 9 };
      rsConf = { id: 'rs', width: 74, height: 74, fontSize: 9 };
    } else {
      let x = screen.height < screen.width ? screen.height : screen.width;
      lsConf = {
        id: 'ls',
        width: x * 0.36,
        height: x * 0.36,
        fontSize: x * 0.04
      };
      rsConf = {
        id: 'rs',
        width: x * 0.36,
        height: x * 0.36,
        fontSize: x * 0.04
      };
    }
    !VirtualController.leftAxis &&
      (VirtualController.leftAxis = new VirtualController.VirtualAxes(
        'axisLeft',
        lsConf
      ));
    !VirtualController.rightAxis &&
      (VirtualController.rightAxis = new VirtualController.VirtualAxes(
        'axisRight',
        rsConf
      ));
  },
  releaseAxis: () => {
    VirtualController.leftAxis.Delete();
    VirtualController.leftAxis = null;
    VirtualController.rightAxis.Delete();
    VirtualController.rightAxis = null;
  },
  touch: (e) => {
    e.preventDefault();
    navigator.vibrate && navigator.vibrate(30);
    VirtualController.handle(e.target.id, 1);
  },
  untouch: (e) => {
    e.preventDefault();
    VirtualController.handle(e.target.id, 0);
  },
  handle: (id, value) => {
    switch (id) {
      case 'btn_x':
        document.getElementById(id).classList.toggle('c-btn-active');
        GamepadController.sendButtonEvent(
          2,
          value,
          VirtualController.controllerId
        );
        break;
      case 'btn_y':
        document.getElementById(id).classList.toggle('c-btn-active');
        GamepadController.sendButtonEvent(
          3,
          value,
          VirtualController.controllerId
        );
        break;
      case 'btn_a':
        document.getElementById(id).classList.toggle('c-btn-active');
        GamepadController.sendButtonEvent(
          0,
          value,
          VirtualController.controllerId
        );
        break;
      case 'btn_b':
        document.getElementById(id).classList.toggle('c-btn-active');
        GamepadController.sendButtonEvent(
          1,
          value,
          VirtualController.controllerId
        );
        break;
      case 'btn_select':
        GamepadController.sendButtonEvent(
          6,
          value,
          VirtualController.controllerId
        );
        break;
      case 'btn_start':
        GamepadController.sendButtonEvent(
          7,
          value,
          VirtualController.controllerId
        );
        break;
      case 'btn_lt':
        document.getElementById(id).classList.toggle('c-btn-active');
        GamepadController.sendAxisEvent(
          2,
          2 * value * GamepadController.MAX_AXIS - GamepadController.MAX_AXIS,
          VirtualController.controllerId
        );
        break;
      case 'btn_lb':
        document.getElementById(id).classList.toggle('c-btn-active');
        GamepadController.sendButtonEvent(
          4,
          value,
          VirtualController.controllerId
        );
        break;
      case 'btn_rt':
        document.getElementById(id).classList.toggle('c-btn-active');
        GamepadController.sendAxisEvent(
          5,
          2 * value * GamepadController.MAX_AXIS - GamepadController.MAX_AXIS,
          VirtualController.controllerId
        );
        break;
      case 'btn_rb':
        document.getElementById(id).classList.toggle('c-btn-active');
        GamepadController.sendButtonEvent(
          5,
          value,
          VirtualController.controllerId
        );
        break;
      case 'pad_up':
        document.getElementById(id).classList.toggle('pad-item-active');
        GamepadController.sendPadEvent(
          value ? 1 : 0,
          VirtualController.controllerId
        );
        break;
      case 'pad_down':
        document.getElementById(id).classList.toggle('pad-item-active');
        GamepadController.sendPadEvent(
          value ? 4 : 0,
          VirtualController.controllerId
        );
        break;
      case 'pad_left':
        document.getElementById(id).classList.toggle('pad-item-active');
        GamepadController.sendPadEvent(
          value ? 8 : 0,
          VirtualController.controllerId
        );
        break;
      case 'pad_right':
        document.getElementById(id).classList.toggle('pad-item-active');
        GamepadController.sendPadEvent(
          value ? 2 : 0,
          VirtualController.controllerId
        );
        break;
      case 'btn_lts':
        document.getElementById(id).classList.toggle('c-btn-active');
        GamepadController.sendButtonEvent(
          8,
          value,
          VirtualController.controllerId
        );
        break;
      case 'btn_rts':
        document.getElementById(id).classList.toggle('c-btn-active');
        GamepadController.sendButtonEvent(
          9,
          value,
          VirtualController.controllerId
        );
        break;
    }
  },
  VirtualAxes: function (container, parameters) {
    let objContainer = document.getElementById(container);
    let id = typeof parameters.id === 'undefined' ? 'axes' : parameters.id,
      width =
        typeof parameters.width === 'undefined'
          ? objContainer.clientWidth
          : parameters.width,
      height =
        typeof parameters.height === 'undefined'
          ? objContainer.clientHeight
          : parameters.height,
      fontSize =
        typeof parameters.fontSize === 'undefined' ? 14 : parameters.fontSize,
      lineWidth = 1,
      strokeColor = 'rgba(255, 255, 255, 0.6)',
      fillText = 'rgba(255, 255, 255, 0.8)',
      fillColor = 'rgba(0, 0, 0, 0.25)';
    fillColorInternal = 'rgba(0, 0, 0, 0.15)';

    let canvas = document.createElement('canvas');
    canvas.id = id;
    canvas.width = width;
    canvas.height = height;
    objContainer.appendChild(canvas);
    let context = canvas.getContext('2d');

    let pressed = 0;
    let threshold = 20;
    let circumference = 2 * Math.PI;
    let externalRadius = width / 2 - 14;
    let internalRadius = externalRadius / 2;

    let maxMoveStick = width / 4 - 6;

    let centerX = canvas.width / 2;
    let centerY = canvas.height / 2;

    let movedX = centerX;
    let movedY = centerY;
    let axesH = 0;
    let axesV = 0;
    let axisXId = id === 'ls' ? 0 : 3;
    let axisYId = id === 'ls' ? 1 : 4;

    canvas.addEventListener(
      'touchstart',
      () => {
        pressed = 1;
      },
      false
    );
    canvas.addEventListener('touchmove', onTouchMove, false);
    canvas.addEventListener('touchend', onTouchEnd, false);

    drawExternal();
    drawInternal();

    function drawExternal() {
      context.beginPath();
      context.arc(centerX, centerY, externalRadius, 0, circumference, false);
      context.lineWidth = lineWidth;
      context.strokeStyle = strokeColor;
      context.fillStyle = fillColor;
      context.stroke();
      context.fill();
    }

    function drawInternal() {
      context.beginPath();
      if (movedX < internalRadius) {
        movedX = maxMoveStick;
      }
      if (movedX + internalRadius > canvas.width) {
        movedX = canvas.width - maxMoveStick;
      }
      if (movedY < internalRadius) {
        movedY = maxMoveStick;
      }
      if (movedY + internalRadius > canvas.height) {
        movedY = canvas.height - maxMoveStick;
      }
      context.arc(movedX, movedY, internalRadius, 0, circumference, false);
      context.fillStyle = fillColorInternal;
      context.fill();
      context.lineWidth = lineWidth;
      context.strokeStyle = strokeColor;
      context.stroke();
      context.font = `bold ${fontSize}px Arial`;
      context.textAlign = 'center';
      context.fillStyle = fillText;
      context.fillText(id.toUpperCase(), movedX, movedY + fontSize / 3);
    }

    function onTouchMove(event) {
      event.preventDefault();
      if (pressed === 1 && event.targetTouches[0].target === canvas) {
        movedX = event.targetTouches[0].pageX;
        movedY = event.targetTouches[0].pageY;
        if (canvas.offsetParent.tagName.toUpperCase() === 'BODY') {
          movedX -= canvas.offsetLeft;
          movedY -= canvas.offsetTop;
        } else {
          movedX -= canvas.offsetParent.offsetLeft;
          movedY -= canvas.offsetParent.offsetTop;
        }
        context.clearRect(0, 0, canvas.width, canvas.height);
        drawExternal();
        drawInternal();
        sendPosition();
      }
    }

    function onTouchEnd() {
      pressed = 0;
      movedX = centerX;
      movedY = centerY;
      context.clearRect(0, 0, canvas.width, canvas.height);
      drawExternal();
      drawInternal();
      sendPosition();
    }

    function sendPosition() {
      let x = (
        GamepadController.MAX_AXIS *
        ((movedX - centerX) / (width / 4 + 6))
      ).toFixed();
      let y = (
        GamepadController.MAX_AXIS *
        ((movedY - centerY) / (height / 4 + 6))
      ).toFixed();
      Math.abs(x - axesH) > threshold &&
        GamepadController.sendAxisEvent(
          axisXId,
          parseInt(x),
          VirtualController.controllerId
        );
      Math.abs(y - axesV) > threshold &&
        GamepadController.sendAxisEvent(
          axisYId,
          parseInt(y),
          VirtualController.controllerId
        );
      axesH = x;
      axesV = y;
    }
    this.Delete = function () {
      objContainer.removeChild(canvas);
    };
  }
};

const GamepadController = {
  AXIS_THRESHOLD: 1200,
  MAX_AXIS: 32767,
  ids: [],
  controllers: {},
  rafId: null,
  padButtons: [[], [], [], []],
  isXbox: false,
  padAxis: [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  connectController: (message) => {
    for (let padIndex in GamepadController.controllers) {
      if (
        GamepadController.controllers[padIndex].id + padIndex ===
        message.name
      ) {
        GamepadController.ids[padIndex] = message.id;
        GamepadController.updateStatus();
        break;
      }
    }
  },
  addgamepad: (systemGamepad) => {
    let name = systemGamepad.id + systemGamepad.index;
    GamepadController.controllers[systemGamepad.index] = systemGamepad;
    SessionHandler.sendEvents({
      type: 'controller',
      action: 'connected',
      name
    });
  },
  removegamepad: (systemGamepad) => {
    SessionHandler.sendEvents({
      type: 'controller',
      action: 'disconnected',
      id: GamepadController.ids[systemGamepad.index]
    });
    delete GamepadController.controllers[systemGamepad.index];
  },
  scangamepads: () => {
    let pads = navigator.getGamepads
      ? navigator.getGamepads()
      : navigator.webkitGetGamepads
      ? navigator.webkitGetGamepads()
      : [];
    for (var i = 0; i < pads.length; i++) {
      if (pads[i]) {
        if (pads[i].index in GamepadController.controllers) {
          GamepadController.controllers[pads[i].index] = pads[i];
        } else {
          GamepadController.addgamepad(pads[i]);
        }
      }
    }
  },
  updateStatus: () => {
    GamepadController.scangamepads();
    for (let index in GamepadController.controllers) {
      let gamepad = GamepadController.controllers[index];

      if (!gamepad) return;
      let isXbox = gamepad.id.includes('Xbox');
      let isPS4 = gamepad.id.includes('DualShok');
      let roundVal;
      //check gamepad buttons
      for (let i = 0; i < gamepad.buttons.length; i++) {
        let bval = gamepad.buttons[i];
        if (typeof bval == 'object') {
          bval = bval.value;
          roundVal =
            Math.round(bval * GamepadController.MAX_AXIS * 2) -
            GamepadController.MAX_AXIS;
        }

        let oldVal =
          GamepadController.padButtons[+index].length > 0
            ? GamepadController.padButtons[+index][i]
            : 0;
        if (oldVal !== bval) {
          if (i === 6) {
            let tempAxes = 2;
            GamepadController.sendAxisEvent(
              tempAxes,
              roundVal,
              GamepadController.ids[+index]
            );
          } else if (i === 7) {
            let tempAxes = 5;
            GamepadController.sendAxisEvent(
              tempAxes,
              roundVal,
              GamepadController.ids[+index]
            );
          } else if (i > 7 && i < 12) {
            GamepadController.sendButtonEvent(
              i - 2,
              bval,
              GamepadController.ids[+index]
            );
          } else if (i > 11 && i < 16) {
            let up = gamepad.buttons[12].value;
            let down = gamepad.buttons[13].value;
            let left = gamepad.buttons[14].value;
            let right = gamepad.buttons[15].value;
            if (up && left) {
              GamepadController.sendPadEvent(9, GamepadController.ids[+index]);
            } else if (up && right) {
              GamepadController.sendPadEvent(3, GamepadController.ids[+index]);
            } else if (down && left) {
              GamepadController.sendPadEvent(12, GamepadController.ids[+index]);
            } else if (down && right) {
              GamepadController.sendPadEvent(6, GamepadController.ids[+index]);
            } else if (up) {
              GamepadController.sendPadEvent(1, GamepadController.ids[+index]);
            } else if (right) {
              GamepadController.sendPadEvent(2, GamepadController.ids[+index]);
            } else if (down) {
              GamepadController.sendPadEvent(4, GamepadController.ids[+index]);
            } else if (left) {
              GamepadController.sendPadEvent(8, GamepadController.ids[+index]);
            } else {
              GamepadController.sendPadEvent(0, GamepadController.ids[+index]);
            }
          } else {
            GamepadController.sendButtonEvent(
              i,
              bval,
              GamepadController.ids[+index]
            );
          }
          GamepadController.padButtons[+index][i] = bval;
        }
      }
      //check gamepad axis
      for (let i = 0; i < gamepad.axes.length; i++) {
        if (SYSTEM_STATS.IS_IPHONE && i > 3) {
          let xval = gamepad.axes[i];
          if (xval !== GamepadController.padAxis[+index][i]) {
            switch (xval) {
              case 1:
                GamepadController.sendPadEvent(
                  i > 4 ? 1 : 2,
                  GamepadController.ids[+index]
                );
                break;
              case -1:
                GamepadController.sendPadEvent(
                  i > 4 ? 4 : 8,
                  GamepadController.ids[+index]
                );
                break;
              default:
                GamepadController.sendPadEvent(
                  0,
                  GamepadController.ids[+index]
                );
            }
          }
          GamepadController.padAxis[+index][i] = xval;
        } else {
          let aval = Math.round(gamepad.axes[i] * GamepadController.MAX_AXIS);
          let diff = Math.abs(GamepadController.padAxis[+index][i] - aval);
          if (diff > GamepadController.AXIS_THRESHOLD) {
            let tempIndex = i > 1 ? i + 1 : i;
            GamepadController.sendAxisEvent(
              tempIndex,
              aval,
              GamepadController.ids[+index]
            );
            GamepadController.padAxis[+index][i] = aval;
          }
        }
      }
    }
    if ('0' in GamepadController.controllers) {
      GamepadController.rafId = window.requestAnimationFrame(
        GamepadController.updateStatus
      );
    }
  },
  cancelUpdate: () => {
    GamepadController.rafId &&
      window.cancelAnimationFrame(GamepadController.rafId);
  },
  sendButtonEvent: (index, val, gamepad_id) => {
    if (gamepad_id) {
      var data = {
        type: 'controller',
        action: 'button',
        id: gamepad_id,
        button: index,
        value: val
      };
      EventHandler.sendRttEvent(data);
    }
  },
  sendPadEvent: (index, gamepad_id) => {
    if (gamepad_id) {
      var data = {
        type: 'controller',
        action: 'pad',
        id: gamepad_id,
        hat: index
      };
      EventHandler.sendRttEvent(data);
    }
  },
  sendAxisEvent: (index, val, gamepad_id) => {
    if (gamepad_id) {
      var data = {
        type: 'controller',
        action: 'axes',
        id: gamepad_id,
        axes: index,
        value: val
      };
      EventHandler.sendRttEvent(data);
    }
  },
  vibrate: (gamepadId, left, right) => {
    let padIndex = Object.keys(GamepadController.ids).find(
      (key) => GamepadController.ids[key] === gamepadId
    );
    let gamepad = GamepadController.controllers[padIndex ? padIndex : 0];
    const MAX_RUMBLE = 65535;
    if (!('vibrationActuator' in gamepad)) {
      return;
    }
    gamepad.vibrationActuator.playEffect('dual-rumble', {
      startDelay: 0,
      duration: 400,
      weakMagnitude: right / MAX_RUMBLE,
      strongMagnitude: left / MAX_RUMBLE
    });
  }
};

const TouchHandler = {
  transform: '',
  posX: 0,
  posY: 0,
  scale: 1,
  last_scale: 1,
  last_posX: 0,
  last_posY: 0,
  max_pos_x: 0,
  max_pos_y: 0,
  zoomInit: () => {
    TouchHandler.transform = 'translate3d(0, 0, 0) ' + 'scale3d(2, 2, 1) ';
    TouchHandler.scale = 2;
    TouchHandler.last_scale = 2;
    try {
      if (
        window
          .getComputedStyle(commonView.videoElement, null)
          .getPropertyValue('-webkit-transform')
          .toString() != 'matrix(1, 0, 0, 1, 0, 0)'
      ) {
        TouchHandler.transform = 'translate3d(0, 0, 0) scale3d(1, 1, 1) ';
        TouchHandler.scale = 1;
        TouchHandler.last_scale = 1;
      }
    } catch (err) {
      Log.e(err);
    }
    commonView.videoElement.style.transform = TouchHandler.transform;
    TouchHandler.transform = '';
  },
  zoom: () => {
    let hammertime = new Hammer(commonView.videoElement, {});
    hammertime.get('pinch').set({
      enable: true
    });
    el = commonView.videoElement;
    hammertime.on('pan pinch panend pinchend', function (ev) {
      if (TouchHandler.scale != 1) {
        TouchHandler.posX = TouchHandler.last_posX + ev.deltaX;
        TouchHandler.posY = TouchHandler.last_posY + ev.deltaY;
        TouchHandler.max_pos_x = Math.ceil(
          ((TouchHandler.scale - 1) * el.clientWidth) / 2
        );
        TouchHandler.max_pos_y = Math.ceil(
          ((TouchHandler.scale - 1) * el.clientHeight) / 2
        );
        if (TouchHandler.posX > TouchHandler.max_pos_x) {
          TouchHandler.posX = TouchHandler.max_pos_x;
        }
        if (TouchHandler.posX < -TouchHandler.max_pos_x) {
          TouchHandler.posX = -TouchHandler.max_pos_x;
        }
        if (TouchHandler.posY > TouchHandler.max_pos_y) {
          TouchHandler.posY = TouchHandler.max_pos_y;
        }
        if (TouchHandler.posY < -TouchHandler.max_pos_y) {
          TouchHandler.posY = -TouchHandler.max_pos_y;
        }
      }
      ev.type == 'pinch' &&
        (TouchHandler.scale = Math.max(
          0.999,
          Math.min(TouchHandler.last_scale * ev.scale, 6)
        ));
      ev.type == 'pinchend' && (TouchHandler.last_scale = TouchHandler.scale);
      if (ev.type == 'panend') {
        TouchHandler.last_posX =
          TouchHandler.posX < TouchHandler.max_pos_x
            ? TouchHandler.posX
            : TouchHandler.max_pos_x;
        TouchHandler.last_posY =
          TouchHandler.posY < TouchHandler.max_pos_y
            ? TouchHandler.posY
            : TouchHandler.max_pos_y;
      }
      TouchHandler.scale != 1 &&
        (TouchHandler.transform =
          'translate3d(' +
          TouchHandler.posX +
          'px,' +
          TouchHandler.posY +
          'px, 0) ' +
          'scale3d(' +
          TouchHandler.scale +
          ', ' +
          TouchHandler.scale +
          ', 1)');
      TouchHandler.transform && (el.style.transform = TouchHandler.transform);
    });
  }
};

async function rotateAndFullscreen() {
  if (document.fullscreen) {
    await document.exitFullscreen();
    screen.orientation.unlock();
  } else {
    await document.documentElement.requestFullscreen();
    await screen.orientation.lock('landscape');
  }
}

const KeyboardHandler = {
  keyboard: null,
  show: () => {
    let Keyboard = window.SimpleKeyboard.default;
    KeyboardHandler.keyboard = new Keyboard({
      onKeyPress: (button) => onKey(button, true),
      onKeyReleased: (button) => onKey(button, false),
      mergeDisplay: true,
      layoutName: 'default',
      layout: {
        default: [
          '{escape} q w e r t y u i o p',
          '{tab} a s d f g h j k l {backspace}',
          '{shift} z x c v b n m {ent}',
          '{numbers} @ . {space} {hide}'
        ],
        shift: [
          '{escape} Q W E R T Y U I O P',
          '{tab} A S D F G H J K L {backspace}',
          '{shift} Z X C V B N M {ent}',
          '{numbers} @ . {space} {hide}'
        ],
        numbers: [
          '1 2 3 4 5 6 7 8 9 0',
          '~ ! # $ % ^ & * ( )',
          "_ + - / : ; ? [ ] '",
          '{abc} @ . , { } " {hide}'
        ]
      },
      display: {
        '{hide}': 'hide',
        '{numbers}': '?123',
        '{ent}': 'return',
        '{escape}': 'esc',
        '{tab}': 'â‡¥',
        '{backspace}': 'âŒ«',
        '{capslock}': 'caps lock â‡ª',
        '{shift}': 'â‡§',
        '{controlleft}': 'ctrl âŒƒ',
        '{controlright}': 'ctrl âŒƒ',
        '{altleft}': 'alt âŒ¥',
        '{altright}': 'alt âŒ¥',
        '{metaleft}': 'cmd âŒ˜',
        '{metaright}': 'cmd âŒ˜',
        '{abc}': 'ABC'
      }
    });
    let upperChar = [
      'Q',
      'W',
      'E',
      'R',
      'T',
      'Y',
      'U',
      'I',
      'O',
      'P',
      'A',
      'S',
      'D',
      'F',
      'G',
      'H',
      'J',
      'K',
      'L',
      'Z',
      'X',
      'C',
      'V',
      'B',
      'N',
      'M'
    ];
    function onKey(button, pressedStatus) {
      let data = {
        type: 'keyboard',
        action: 'button'
      };
      if (pressedStatus) {
        switch (button) {
          case '{hide}':
            EventHandler.release();
            KeyboardHandler.hide();
            break;
          case '{shift}':
            handleShift();
            break;
          case '{numbers}':
          case '{abc}':
            handleNumbers();
            return;
          case '!':
            sendCustomChar(49);
            return;
          case '@':
            sendCustomChar(50);
            return;
          case '#':
            sendCustomChar(51);
            return;
          case '$':
            sendCustomChar(52);
            return;
          case '%':
            sendCustomChar(53);
            return;
          case '^':
            sendCustomChar(54);
            return;
          case '&':
            sendCustomChar(55);
            return;
          case '*':
            sendCustomChar(56);
            return;
          case '(':
            sendCustomChar(57);
            return;
          case ')':
            sendCustomChar(48);
            return;
          case '+':
            sendCustomChar(187);
            return;
          case '_':
            sendCustomChar(189);
            return;
          case '?':
            sendCustomChar(191);
            return;
          case ':':
            sendCustomChar(186);
            return;
          case '{':
            sendCustomChar(219);
            return;
          case '}':
            sendCustomChar(221);
            return;
          case '"':
            sendCustomChar(222);
            return;
        }
        upperChar.forEach((item) => {
          if (item === button) {
            let code = findCode(button.toLowerCase());
            if (code) sendCustomChar(code);
            return;
          }
        });
      }

      data.isPressed = pressedStatus;
      data.code = findCode(button);
      data.code && EventHandler.sendRttEvent(data);
    }
    function findCode(button) {
      for (let code in virtualKeyCodes) {
        if (virtualKeyCodes[code] === button) {
          return parseInt(code);
        }
      }
      return null;
    }

    function sendCustomChar(code) {
      let data = {
        type: 'keyboard',
        action: 'button',
        isPressed: true,
        code: 16
      };
      EventHandler.sendRttEvent(data);
      data.code = code;
      EventHandler.sendRttEvent(data);
      data.isPressed = false;
      EventHandler.sendRttEvent(data);
      data.code = 16;
      EventHandler.sendRttEvent(data);
    }

    function handleShift() {
      let currentLayout = KeyboardHandler.keyboard.options.layoutName;
      let shiftToggle = currentLayout === 'default' ? 'shift' : 'default';
      KeyboardHandler.keyboard.setOptions({
        layoutName: shiftToggle
      });
    }
    function handleNumbers() {
      let currentLayout = KeyboardHandler.keyboard.options.layoutName;
      let numbersToggle = currentLayout !== 'numbers' ? 'numbers' : 'default';
      KeyboardHandler.keyboard.setOptions({
        layoutName: numbersToggle
      });
    }
  },
  hide: () => {
    KeyboardHandler.keyboard && KeyboardHandler.keyboard.destroy();
    KeyboardHandler.keyboard = null;
  }
};

const CursorHandler = {
  cursorState: 1,
  lastCursorState: 0,
  lastCursorIconName: null,
  isLocked: () => {
    return (
      commonView.videoElement === document.pointerLockElement ||
      commonView.videoElement === document.mozPointerLockElement ||
      commonView.videoElement === document.webkitPointerLockElement
    );
  },
  changeCallback: () => CursorHandler.isLocked(),
  errorCallback: () => Log.e('PointerLock error'),
  validateCursorDataJSON: (cursorData) => {
    cursorData.resource &&
      !sessionStorage.getItem(cursorData.name) &&
      sessionStorage.setItem(cursorData.name, cursorData.resource);
    cursorData.name && CursorHandler.changeSessionCursor(cursorData.name);
    if (CursorHandler.cursorState > 1) {
      if (cursorData.isVisible) {
        CursorHandler.cursorState = 2;
        // if(CursorHandler.isLocked())
        !SYSTEM_STATS.IS_MOBILE && document.exitPointerLock();
      } else {
        CursorHandler.cursorState = 3;
        !SYSTEM_STATS.IS_MOBILE && commonView.videoElement.requestPointerLock();
      }
      CursorHandler.lastCursorState = CursorHandler.cursorState;
    }
  },
  changeSessionCursor: (cursorName) => {
    if (CursorHandler.cursorState > 1) {
      if (cursorName === 'none') {
        commonView.videoElement.style.cursor = 'none';
      } else {
        let cursorResource = sessionStorage.getItem(cursorName);
        if (cursorResource) {
          commonView.videoElement.style.cursor =
            'url(data:application/cur;base64,' + cursorResource + '),' + 'auto';
          CursorHandler.lastCursorIconName = cursorName;
        } else {
          SessionHandler.sendEvents({
            type: 'cursor',
            action: 'missed',
            name: cursorName
          });
        }
      }
    } else {
      commonView.videoElement.style.cursor = 'default';
    }
  }
};

const virtualKeyCodes = {
  0: 'That key has no keycode',
  3: 'break',
  8: '{backspace}',
  9: '{tab}',
  12: 'clear',
  13: '{ent}',
  16: '{shift}',
  17: 'ctrl',
  18: 'alt',
  19: 'pause/break',
  20: 'caps lock',
  21: 'hangul',
  25: 'hanja',
  27: '{escape}',
  28: 'conversion',
  29: 'non-conversion',
  32: '{space}',
  33: 'page up',
  34: 'page down',
  35: 'end',
  36: 'home',
  37: 'left arrow',
  38: 'up arrow',
  39: 'right arrow',
  40: 'down arrow',
  41: 'select',
  42: 'print',
  43: 'execute',
  44: 'Print Screen',
  45: 'insert',
  46: 'delete',
  47: 'help',
  48: '0',
  49: '1',
  50: '2',
  51: '3',
  52: '4',
  53: '5',
  54: '6',
  55: '7',
  56: '8',
  57: '9',
  58: ':',
  59: 'semicolon (firefox), equals',
  60: '<',
  61: 'equals (firefox)',
  63: 'ÃŸ',
  64: '@ (firefox)',
  65: 'a',
  66: 'b',
  67: 'c',
  68: 'd',
  69: 'e',
  70: 'f',
  71: 'g',
  72: 'h',
  73: 'i',
  74: 'j',
  75: 'k',
  76: 'l',
  77: 'm',
  78: 'n',
  79: 'o',
  80: 'p',
  81: 'q',
  82: 'r',
  83: 's',
  84: 't',
  85: 'u',
  86: 'v',
  87: 'w',
  88: 'x',
  89: 'y',
  90: 'z',
  91: 'Windows Key / Left âŒ˜ / Chromebook Search key',
  92: 'right window key',
  93: 'Windows Menu / Right âŒ˜',
  95: 'sleep',
  96: 'numpad 0',
  97: 'numpad 1',
  98: 'numpad 2',
  99: 'numpad 3',
  100: 'numpad 4',
  101: 'numpad 5',
  102: 'numpad 6',
  103: 'numpad 7',
  104: 'numpad 8',
  105: 'numpad 9',
  106: 'multiply',
  107: 'add',
  108: 'numpad period (firefox)',
  109: 'subtract',
  110: 'decimal point',
  111: 'divide',
  112: 'f1',
  113: 'f2',
  114: 'f3',
  115: 'f4',
  116: 'f5',
  117: 'f6',
  118: 'f7',
  119: 'f8',
  120: 'f9',
  121: 'f10',
  122: 'f11',
  123: 'f12',
  124: 'f13',
  125: 'f14',
  126: 'f15',
  127: 'f16',
  128: 'f17',
  129: 'f18',
  130: 'f19',
  131: 'f20',
  132: 'f21',
  133: 'f22',
  134: 'f23',
  135: 'f24',
  144: 'num lock',
  145: 'scroll lock',
  160: '^',
  161: '!',
  162: 'Ø› (arabic semicolon)',
  163: '#',
  164: '$',
  165: 'Ã¹',
  166: 'page backward',
  167: 'page forward',
  168: 'refresh',
  169: 'closing paren (AZERTY)',
  170: '*',
  171: '~ + * key',
  172: 'home key',
  173: 'minus (firefox), mute/unmute',
  174: 'decrease volume level',
  175: 'increase volume level',
  176: 'next',
  177: 'previous',
  178: 'stop',
  179: 'play/pause',
  180: 'e-mail',
  181: 'mute/unmute (firefox)',
  182: 'decrease volume level (firefox)',
  183: 'increase volume level (firefox)',
  186: ';',
  187: '=',
  188: ',',
  189: '-',
  190: '.',
  191: '/',
  192: '~',
  193: '?, / or Â°',
  194: 'numpad period (chrome)',
  219: '[',
  220: '\\',
  221: ']',
  222: "'",
  223: '`',
  224: 'left or right âŒ˜ key (firefox)',
  225: 'altgr',
  226: '< /git >, left back slash',
  230: 'GNOME Compose Key',
  231: 'Ã§',
  233: 'XF86Forward',
  234: 'XF86Back',
  235: 'non-conversion',
  240: 'alphanumeric',
  242: 'hiragana/katakana',
  243: 'half-width/full-width',
  244: 'kanji',
  251: 'unlock trackpad (Chrome/Edge)',
  255: 'toggle touchpad'
};
