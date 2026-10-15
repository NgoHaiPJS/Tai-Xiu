(() => {
  const STORAGE_KEY = 'lucky-table:state:v1';
  const STARTING_BALANCE = 1_000_000;
  const MIN_WAGER = 100;
  const PAYOUT_MULTIPLIER = 1.95;
  const MAX_HISTORY = 30;
  const SAMPLE_REVIEWS_KEY = 'lucky-table:sample-reviews:v1';
  const pipLayouts = {
    1: [5],
    2: [1, 9],
    3: [1, 5, 9],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9],
  };

  const elements = {
    balance: document.querySelector('#balance'),
    welcomeBadge: document.querySelector('#welcomeBadge'),
    roundNumber: document.querySelector('#roundNumber'),
    wagerInput: document.querySelector('#wagerInput'),
    rollButton: document.querySelector('#rollButton'),
    resultLine: document.querySelector('#resultLine'),
    roundsPlayed: document.querySelector('#roundsPlayed'),
    roundsWon: document.querySelector('#roundsWon'),
    winRate: document.querySelector('#winRate'),
    bestRoll: document.querySelector('#bestRoll'),
    streakMessage: document.querySelector('#streakMessage'),
    historyList: document.querySelector('#historyList'),
    toast: document.querySelector('#toast'),
    resultModal: document.querySelector('#resultModal'),
    resultDialog: document.querySelector('.result-dialog'),
    modalCharacter: document.querySelector('#modalCharacter'),
    modalEyebrow: document.querySelector('#modalEyebrow'),
    modalTitle: document.querySelector('#modalTitle'),
    modalMessage: document.querySelector('#modalMessage'),
    modalDice: document.querySelector('#modalDice'),
    modalTotal: document.querySelector('#modalTotal'),
    modalCoins: document.querySelector('#modalCoins'),
    confettiRain: document.querySelector('#confettiRain'),
    soundToggle: document.querySelector('#soundToggle'),
    topupModal: document.querySelector('#topupModal'),
    topupDialog: document.querySelector('.topup-dialog'),
    topupPlans: document.querySelector('#topupPlans'),
    topupCheckout: document.querySelector('#topupCheckout'),
    checkoutPackage: document.querySelector('#checkoutPackage'),
  };

  function readSavedState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && Number.isFinite(saved.balance) && Array.isArray(saved.history)) {
        const history = saved.history.slice(0, MAX_HISTORY);
        const roundsPlayed = Number.isFinite(saved.stats?.roundsPlayed)
          ? Math.max(0, Math.floor(saved.stats.roundsPlayed))
          : saved.history.length;
        const roundsWon = Number.isFinite(saved.stats?.roundsWon)
          ? Math.max(0, Math.floor(saved.stats.roundsWon))
          : saved.history.filter((round) => round.outcome === 'win').length;
        return {
          balance: Math.max(0, Math.floor(saved.balance)),
          history,
          welcomed: Boolean(saved.welcomed),
          hasPlayed: Boolean(saved.hasPlayed || roundsPlayed),
          stats: {
            roundsPlayed,
            roundsWon,
            bestRoll: Number.isFinite(saved.stats?.bestRoll)
              ? Math.max(0, Math.floor(saved.stats.bestRoll))
              : history.reduce((top, round) => Math.max(top, round.total), 0),
          },
        };
      }
    } catch {
      // Continue with a fresh local game if browser storage is unavailable.
    }
    return {
      balance: STARTING_BALANCE,
      history: [],
      welcomed: false,
      hasPlayed: false,
      stats: { roundsPlayed: 0, roundsWon: 0, bestRoll: 0 },
    };
  }

  const state = readSavedState();
  let selectedSide = null;
  let rolling = false;
  let toastTimer;
  let lastFocusedElement;
  let audioContext;
  let rollSoundTimer;
  let soundEnabled = true;
  let selectedTopupAmount = 0;
  let topupFocusReturn;

  function readLocalValue(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  const savedSampleReviews = readLocalValue(SAMPLE_REVIEWS_KEY, {});

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      showToast('Trình duyệt chưa thể lưu trò chơi trên thiết bị này.');
    }
  }

  function formatCoins(value) {
    return Math.floor(value).toLocaleString('vi-VN');
  }

  function render() {
    elements.balance.textContent = formatCoins(state.balance);
    elements.welcomeBadge.hidden = state.hasPlayed;
    elements.roundNumber.textContent = String(state.stats.roundsPlayed + 1).padStart(3, '0');
    elements.roundsPlayed.textContent = String(state.stats.roundsPlayed);
    elements.roundsWon.textContent = String(state.stats.roundsWon);
    elements.winRate.textContent = state.stats.roundsPlayed
      ? `${Math.round((state.stats.roundsWon / state.stats.roundsPlayed) * 100)}%`
      : '—';
    elements.bestRoll.textContent = state.stats.bestRoll || '—';
    elements.streakMessage.textContent = state.stats.roundsPlayed
      ? state.stats.roundsWon > 0 ? `Bạn đã thắng ${state.stats.roundsWon} ván. Lắc tiếp nào!` : 'Ván sau biết đâu sẽ may mắn hơn!'
      : 'Vận may đầu tiên đang chờ bạn!';
    renderHistory();
  }

  function renderHistory() {
    if (state.history.length === 0) {
      elements.historyList.innerHTML = '<div class="empty-history"><span class="empty-dice" aria-hidden="true">⚄</span><span>Chuyện vui bắt đầu từ một lần lắc!</span></div>';
      return;
    }

    elements.historyList.innerHTML = state.history.slice(0, 4).map((round) => {
      const sideLabel = round.side === 'tai' ? 'TÀI' : round.side === 'xiu' ? 'XỈU' : 'HÒA';
        const resultLabel = round.outcome === 'win' ? `+${formatCoins(round.change)}` : round.outcome === 'push' ? 'HOÀN VND' : `−${formatCoins(round.wager)}`;
      const outcomeClass = round.outcome === 'win' ? '' : round.outcome;
      const sideClass = round.outcome === 'push' ? 'push' : round.side;
      return `<div class="history-entry"><div class="history-main"><span class="history-side ${sideClass}">${sideLabel}</span><span><span class="history-total">${round.total} ĐIỂM</span><span class="history-detail">${round.dice.join(' · ')} &nbsp;|&nbsp; Cược ${formatCoins(round.wager)} VND ảo</span></span></div><span class="history-outcome ${outcomeClass}">${resultLabel}</span></div>`;
    }).join('');
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => elements.toast.classList.remove('visible'), 2600);
  }

  function getAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext ??= new AudioContextClass();
    if (audioContext.state === 'suspended') audioContext.resume();
    return audioContext;
  }

  function playDieSound(landing = false) {
    if (!soundEnabled) return;
    const context = getAudioContext();
    if (!context) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = landing ? 'triangle' : 'square';
    oscillator.frequency.setValueAtTime(landing ? 150 : 340 + Math.random() * 240, now);
    oscillator.frequency.exponentialRampToValueAtTime(landing ? 75 : 150, now + (landing ? 0.12 : 0.045));
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(landing ? 0.07 : 0.025, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (landing ? 0.14 : 0.055));
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + (landing ? 0.15 : 0.06));
  }

  function updateSampleReviews() {
    document.querySelectorAll('.sample-review').forEach((review) => {
      const text = review.querySelector('.sample-review-text');
      if (typeof savedSampleReviews[review.dataset.review] === 'string') {
        text.textContent = savedSampleReviews[review.dataset.review];
      }
    });
  }

  function editSampleReview(button) {
    const review = button.closest('.sample-review');
    const text = review.querySelector('.sample-review-text');
    const editor = review.querySelector('.sample-review-editor');
    const editing = !editor.hidden;

    if (!editing) {
      editor.value = text.textContent;
      text.hidden = true;
      editor.hidden = false;
      button.textContent = 'LƯU NHẬN XÉT';
      editor.focus();
      return;
    }

    const updatedText = editor.value.trim();
    if (!updatedText) {
      showToast('Nhận xét mẫu không được để trống.');
      editor.focus();
      return;
    }

    text.textContent = updatedText;
    text.hidden = false;
    editor.hidden = true;
    button.textContent = 'SỬA NHẬN XÉT';
    savedSampleReviews[review.dataset.review] = updatedText;
    try {
      localStorage.setItem(SAMPLE_REVIEWS_KEY, JSON.stringify(savedSampleReviews));
      showToast('Đã lưu nội dung nhận xét mẫu.');
    } catch {
      showToast('Không thể lưu nhận xét trên thiết bị này.');
    }
  }

  function makeConfetti() {
    elements.confettiRain.replaceChildren();
    for (let index = 0; index < 44; index += 1) {
      const piece = document.createElement('i');
      piece.className = `confetti-piece confetti-${index % 6}`;
      piece.style.setProperty('--x', `${Math.random() * 100}%`);
      piece.style.setProperty('--drift', `${Math.random() * 100 - 50}px`);
      piece.style.setProperty('--delay', `${Math.random() * 450}ms`);
      piece.style.setProperty('--spin', `${Math.random() * 900 - 450}deg`);
      elements.confettiRain.append(piece);
    }
  }

  function showResultModal(outcome, result, wager, change) {
    const messages = {
      win: {
        character: '🥳', eyebrow: 'VẬN MAY GÕ CỬA', title: 'Bạn thắng rồi!',
        message: `Bạn lời ${formatCoins(change)} VND ảo. Quá đỉnh!`, coins: `+${formatCoins(change)} VND ảo`,
      },
      loss: {
        character: '😿', eyebrow: 'MỘT CHÚT CHƯA MAY', title: 'Ôi, suýt nữa!',
        message: 'Ván này chưa trúng rồi. Nghỉ một nhịp rồi chơi tiếp nhé!', coins: `−${formatCoins(wager)} VND ảo`,
      },
      push: {
        character: '🤹', eyebrow: 'BỘ BA XÚC XẮC XUẤT HIỆN', title: 'Hoàn VND ảo nhé!',
          message: 'Ba mặt giống nhau! Số VND ảo đã cược được trả lại đầy đủ.', coins: `Hoàn ${formatCoins(wager)} VND ảo`,
      },
    }[outcome];

    lastFocusedElement = document.activeElement;
    elements.resultModal.dataset.outcome = outcome;
    elements.modalCharacter.textContent = messages.character;
    elements.modalEyebrow.textContent = messages.eyebrow;
    elements.modalTitle.textContent = messages.title;
    elements.modalMessage.textContent = messages.message;
    elements.modalDice.textContent = result.dice.join(' · ');
    elements.modalTotal.textContent = `Tổng ${result.total}`;
    elements.modalCoins.textContent = messages.coins;
    if (outcome === 'win') makeConfetti();
    else elements.confettiRain.replaceChildren();
    elements.resultModal.classList.add('is-open');
    elements.resultModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    document.querySelector('#closeModal').focus();
  }

  function closeResultModal() {
    if (!elements.resultModal.classList.contains('is-open')) return;
    elements.resultModal.classList.remove('is-open');
    elements.resultModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    lastFocusedElement?.focus();
  }

  function openTopup() {
    topupFocusReturn = document.activeElement;
    selectedTopupAmount = 0;
    elements.topupPlans.hidden = false;
    elements.topupCheckout.hidden = true;
    elements.topupModal.classList.add('is-open');
    elements.topupModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    document.querySelector('#closeTopup').focus();
  }

  function closeTopup() {
    if (!elements.topupModal.classList.contains('is-open')) return;
    elements.topupModal.classList.remove('is-open');
    elements.topupModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    topupFocusReturn?.focus();
  }

  function selectTopupPlan(amount) {
    selectedTopupAmount = amount;
    elements.checkoutPackage.textContent = `${formatCoins(amount)} VND ảo`;
    elements.topupPlans.hidden = true;
    elements.topupCheckout.hidden = false;
    document.querySelector('#claimCoins').focus();
  }

  function claimTopupCoins() {
    if (!selectedTopupAmount) return;
    const claimedAmount = selectedTopupAmount;
    state.balance += claimedAmount;
    persist();
    render();
    closeTopup();
    showToast(`Đã nhận miễn phí ${formatCoins(claimedAmount)} VND ảo!`);
  }

  function setDie(die, value) {
    die.dataset.value = String(value);
    die.setAttribute('aria-label', `Xúc xắc: ${value}`);
    die.querySelectorAll('.pip').forEach((pip, index) => {
      pip.style.opacity = pipLayouts[value].includes(index + 1) ? '1' : '0';
    });
  }

  function setSelectedSide(side) {
    selectedSide = side;
    document.querySelectorAll('.bet-option').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.side === side));
    });
  }

  function setWager(value) {
    const amount = Math.min(state.balance, Math.max(MIN_WAGER, Math.floor(Number(value) || MIN_WAGER)));
    elements.wagerInput.value = String(amount);
    document.querySelectorAll('[data-wager]').forEach((button) => {
      button.classList.toggle('quick-active', Number(button.dataset.wager) === amount);
    });
  }

  function rollDice() {
    const dice = [1, 2, 3].map(() => Math.floor(Math.random() * 6) + 1);
    const total = dice.reduce((sum, value) => sum + value, 0);
    const triple = dice.every((value) => value === dice[0]);
    return { dice, total, triple, resultSide: total <= 10 ? 'xiu' : 'tai' };
  }

  function playRound() {
    if (rolling) return;
    if (!selectedSide) {
      showToast('Chọn Tài hoặc Xỉu trước khi lắc nhé!');
      return;
    }

    const wager = Math.floor(Number(elements.wagerInput.value));
    if (!Number.isFinite(wager) || wager < MIN_WAGER) {
      showToast(`Mức cược tối thiểu là ${formatCoins(MIN_WAGER)} VND ảo.`);
      setWager(MIN_WAGER);
      return;
    }
    if (wager > state.balance) {
      showToast('Bạn không có đủ VND ảo cho mức cược này.');
      setWager(state.balance);
      return;
    }

    rolling = true;
    elements.rollButton.disabled = true;
    elements.rollButton.querySelector('span:last-child').textContent = 'ĐANG LẮC…';
    state.balance -= wager;
    render();

    const result = rollDice();
    const diceElements = [0, 1, 2].map((index) => document.querySelector(`#die${index}`));
    diceElements.forEach((die) => die.classList.add('rolling'));
    playDieSound();
    clearInterval(rollSoundTimer);
    rollSoundTimer = soundEnabled ? setInterval(() => playDieSound(), 230) : null;
    elements.resultLine.className = 'result-line';
    elements.resultLine.innerHTML = '<span class="result-dash"></span> CÙNG XEM NÀO… <span class="result-dash"></span>';

    diceElements.forEach((die, index) => {
      setTimeout(() => {
        die.classList.remove('rolling');
        die.classList.add('landed');
        setDie(die, result.dice[index]);
        playDieSound(true);
        setTimeout(() => die.classList.remove('landed'), 380);
      }, 1650 + index * 350);
    });

    setTimeout(() => {
      clearInterval(rollSoundTimer);

      const outcome = result.triple ? 'push' : result.resultSide === selectedSide ? 'win' : 'loss';
      const resultLabel = result.resultSide === 'tai' ? 'TÀI' : 'XỈU';
      let change = -wager;
      if (outcome === 'push') {
        state.balance += wager;
        change = 0;
        elements.resultLine.innerHTML = `<span class="result-dash"></span> BỘ BA ${result.total} — ĐÃ HOÀN CƯỢC <span class="result-dash"></span>`;
        elements.resultLine.classList.add('is-push');
      } else if (outcome === 'win') {
        const payout = Math.floor(wager * PAYOUT_MULTIPLIER);
        state.balance += payout;
        change = payout - wager;
        elements.resultLine.innerHTML = `<span class="result-dash"></span> ${result.total} ${resultLabel} — BẠN THẮNG RỒI! <span class="result-dash"></span>`;
        elements.resultLine.classList.add('is-win');
      } else {
        elements.resultLine.innerHTML = `<span class="result-dash"></span> ${result.total} ${resultLabel} — LẦN SAU MAY MẮN HƠN! <span class="result-dash"></span>`;
        elements.resultLine.classList.add('is-loss');
      }

      state.history.unshift({ dice: result.dice, total: result.total, side: selectedSide, wager, outcome, change, at: Date.now() });
      state.history = state.history.slice(0, MAX_HISTORY);
      state.welcomed = true;
      state.hasPlayed = true;
      state.stats.roundsPlayed += 1;
      state.stats.roundsWon += outcome === 'win' ? 1 : 0;
      state.stats.bestRoll = Math.max(state.stats.bestRoll, result.total);
      persist();
      render();
      rolling = false;
      elements.rollButton.disabled = false;
      elements.rollButton.querySelector('span:last-child').textContent = 'LẮC XÚC XẮC';
      setWager(Math.min(Number(elements.wagerInput.value), state.balance));
      showResultModal(outcome, result, wager, change);
    }, 2850);
  }

  document.querySelectorAll('.bet-option').forEach((button) => {
    button.addEventListener('click', () => setSelectedSide(button.dataset.side));
  });
  document.querySelectorAll('[data-wager]').forEach((button) => {
    button.addEventListener('click', () => setWager(Number(button.dataset.wager)));
  });
  document.querySelector('#decreaseWager').addEventListener('click', () => setWager(Number(elements.wagerInput.value) - 1000));
  document.querySelector('#increaseWager').addEventListener('click', () => setWager(Number(elements.wagerInput.value) + 1000));
  elements.wagerInput.addEventListener('change', () => setWager(elements.wagerInput.value));
  elements.rollButton.addEventListener('click', playRound);
  elements.soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    elements.soundToggle.setAttribute('aria-pressed', String(soundEnabled));
    elements.soundToggle.setAttribute('aria-label', soundEnabled ? 'Tắt âm thanh xúc xắc' : 'Bật âm thanh xúc xắc');
    elements.soundToggle.querySelector('.sound-label').textContent = soundEnabled ? 'ÂM THANH BẬT' : 'ÂM THANH TẮT';
    elements.soundToggle.querySelector('[aria-hidden="true"]').textContent = soundEnabled ? '♫' : '♩';
    if (!soundEnabled) clearInterval(rollSoundTimer);
  });
  document.querySelector('#openTopup').addEventListener('click', openTopup);
  document.querySelector('#closeTopup').addEventListener('click', closeTopup);
  document.querySelectorAll('[data-close-topup]').forEach((backdrop) => {
    backdrop.addEventListener('click', closeTopup);
  });
  document.querySelectorAll('[data-plan]').forEach((button) => {
    button.addEventListener('click', () => selectTopupPlan(Number(button.dataset.plan)));
  });
  document.querySelector('#backToPlans').addEventListener('click', () => {
    selectedTopupAmount = 0;
    elements.topupCheckout.hidden = true;
    elements.topupPlans.hidden = false;
    document.querySelector('[data-plan="500000"]').focus();
  });
  document.querySelector('#claimCoins').addEventListener('click', claimTopupCoins);
  document.querySelector('#closeModal').addEventListener('click', closeResultModal);
  document.querySelector('#continueButton').addEventListener('click', closeResultModal);
  document.querySelectorAll('[data-close-modal]').forEach((backdrop) => {
    backdrop.addEventListener('click', closeResultModal);
  });
  document.addEventListener('keydown', (event) => {
    if (elements.topupModal.classList.contains('is-open') && event.key === 'Escape') {
      closeTopup();
      return;
    }
    if (!elements.resultModal.classList.contains('is-open')) return;
    if (event.key === 'Escape') closeResultModal();
    if (event.key === 'Tab') {
      const focusable = [...elements.resultDialog.querySelectorAll('button')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  document.querySelector('#clearHistory').addEventListener('click', () => {
    if (rolling || state.history.length === 0) return;
    state.history = [];
    persist();
    render();
    showToast('Đã xóa lịch sử các ván chơi.');
  });

  document.querySelectorAll('.sample-review-edit').forEach((button) => {
    button.addEventListener('click', () => editSampleReview(button));
  });

  if (!state.welcomed) {
    state.welcomed = true;
    persist();
  }
  render();
  updateSampleReviews();
})();
