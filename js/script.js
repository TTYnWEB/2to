//[ ELEM ]/////////////////////////////////////////////////////////////////////
const html          = document.documentElement;
const form          = document.getElementById('form');
const clipR         = document.getElementById('clip-r');
const clipW         = document.getElementById('clip-w');
const copyBtn       = document.getElementById('copy');
const installBtn    = document.getElementById('install-btn');
const urlInput      = document.getElementById('url');
const themeToggle   = document.getElementById('theme-toggle');
const invalidHelp   = document.getElementById('invalid-helper');
const submitButton  = document.getElementById('submit-btn');
const inputShortURL = document.getElementById('short-url');
const modalShortURL = document.getElementById('modal-short-url');
const modalClipR    = document.getElementById('modal-clip-r');
const modals        = document.querySelectorAll('[id^="modal-"]');
const closeBtn      = document.querySelectorAll('[aria-label="Close"]');

//[ DATA ]/////////////////////////////////////////////////////////////////////
const PERMISSIONS = {
  CLIPBOARD_READ: 'clipboard-read',
  CLIPBOARD_WRITE: 'clipboard-write',
};

const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

//[ FUNC ]/////////////////////////////////////////////////////////////////////
const setTheme = mode => {
  html.setAttribute('data-theme', mode);
  localStorage.setItem('theme', mode);
};

const initTheme = () => {
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme) {
    html.setAttribute('data-theme', storedTheme);
    themeToggle.checked = (storedTheme === 'light');
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    html.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    themeToggle.checked = !prefersDark;
    localStorage.setItem('theme', prefersDark ? 'dark' : 'light');
  }
};

const selectText = e => e.target.select();
//const isModalOpen = () => modalShortURL.open;
const isModalOpen = () => [...modals].some(({ open }) => open);
const queryPermissions = async (name) => (
  navigator.permissions.query({ name })
    .catch(() => ({ state: null }))
);

const toggleValidity = bool => {
  submitButton.disabled = bool;
  urlInput.setAttribute('aria-invalid', bool);
};

const setClipPref = (elem, key, bool) => {
  elem.checked = bool;
  const boolStr = (bool ? 'true' : 'false');
  localStorage.setItem(key, boolStr);
};

const setClipRstate = bool => {
  clipR.checked = bool;
  localStorage.setItem('clip-r', `${bool}`);
};

const toggleSetting = async (elem, itemName, permissionName) => {
  const val = localStorage.getItem(itemName);
  if (!val)
    return null;
  const { state: permissionState } = await queryPermissions(permissionName);
  if (permissionState !== 'granted') {
    elem.checked = false;
    return null;
  }
  const state = (val === 'true');
  elem.checked = state;
};

const initSettings = () => {
  toggleSetting(clipR, 'clip-r', PERMISSIONS.CLIPBOARD_READ);
  toggleSetting(clipW, 'clip-w', PERMISSIONS.CLIPBOARD_WRITE);
};

const showShortURL = key => {
  invalidHelp.setAttribute('hidden', true);

  const shortURL = `https://2to.co/${key}`;
  inputShortURL.value = shortURL;
  modalShortURL.showModal();
  inputShortURL.select();

  const isClipW = (localStorage.getItem('clip-w') === 'true');
  if (isClipW)
    navigator.clipboard.writeText(inputShortURL.value);
};

const addURL = async () => {
  const url = urlInput.value;
  const payload = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  };
  const res = await fetch('/api/add', payload)
    .then(res => res.json())
    .then(({ key }) => showShortURL(key))
    .catch(err => {
      invalidHelp.removeAttribute('hidden');
      submitButton.disabled = true;
      urlInput.setAttribute('aria-invalid', true);
    });
};

const toggleSubmitBtn = () => {
  if (!urlInput.value.length) {
    urlInput.removeAttribute('aria-invalid');
    return null;
  }
  invalidHelp.setAttribute('hidden', true);
  toggleValidity(!urlInput.validity.valid);
};

const autoPaste = async () => {
  const { state } = await queryPermissions(PERMISSIONS.CLIPBOARD_READ);
  if ((state !== 'granted') || (!document.hasFocus()))
    return null;

  const isClipR = (localStorage.getItem('clip-r') === 'true');
  if (isClipR) {
    const clipContent = await navigator.clipboard.readText();
    const isParseable = urlRegex.test(clipContent);
    if (!isParseable)
      return null;
    urlInput.value = clipContent;
    toggleSubmitBtn();
    urlInput.focus();
  }
};

//[ EventListeners ]////////////////////////////////////////////////////////////
// EL - theme
themeToggle.addEventListener('change', () => (
  setTheme(themeToggle.checked ? 'light' : 'dark')
));

// EL - input
// Event listener to enable/disable submit button based on input value
// validatorjs npm pkg - isURL() func
const debounce = (fn, delay = 300) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};
// let debounceTimeout;
urlInput.addEventListener('input', () => {  // NOTE: should be change (review all change vs input)?
  debounce(toggleSubmitBtn, 100);
  // clearTimeout(debounceTimeout);
  // debounceTimeout = setTimeout(toggleSubmitBtn, 100);
});
// paste
urlInput.addEventListener('paste', debounce(toggleSubmitBtn, 100));


// EL - form submit
form.addEventListener('submit', (event) => {
  event.preventDefault();
  addURL();
});

// EL - clip-r
// NOTE: doesn't work on ffox
clipR.addEventListener('change', async () => {
  const onIntention = clipR.checked;
  const { state: clipRpermState } = await queryPermissions(PERMISSIONS.CLIPBOARD_READ);
  // for FFOX, might want to just remove entirely if FFOX detected
  if (!clipRpermState) {
    setClipPref(clipR, 'clip-r', false);
    clipR.disabled = true;
    return null;
  }
  const [
    clipRpermGranted,
    clipRpermDenied,
  ] = [
    (clipRpermState === 'granted'),
    (clipRpermState === 'denied'),
  ];
  if ((onIntention && clipRpermDenied) || (!onIntention && clipRpermGranted))
    modalClipR.showModal();
    
  await navigator.clipboard.readText()
    .then(() => setClipPref(clipR, 'clip-r', true))
    .catch(() => setClipPref(clipR, 'clip-r', false))

});

// EL - clip-w
clipW.addEventListener('change', () => (
  setClipPref(clipW, 'clip-w', clipW.checked)
));

// EL - shortURL
inputShortURL.addEventListener('click', selectText);
inputShortURL.addEventListener('touchstart', selectText);

// EL - modal
//    - modal - Close with a click outside
modals.forEach(modal => {
  modal.addEventListener('click', (event) => {
    const article = modal.querySelector('article');
    if (article && !article.contains(event.target)) {
      modal.close();
    }
  });
});

//    - modal - Close with Close btn
closeBtn.forEach(btn => {
  btn.addEventListener('click', () => {
    const openModal = [...modals].find(modal => modal.open);
    openModal.close();
  //modals.forEach(modal => modal.close())
  //modalShortURL.close()
  });
});

//    - modal - Close with ESC key
document.addEventListener('keydown', (event) => {
  if (!isModalOpen())
    return;
  const openModal = [...modals].find(modal => modal.open);
  if (event.key === "Escape")
    openModal.close();
    //modals.forEach(modal => modal.close());
    //modalShortURL.close();
});

//    - modal - copyBtn - copy Short URL to clipboard
copyBtn.addEventListener('click', () => (
  navigator.clipboard.writeText(inputShortURL.value)
));


//[ MAIN ]/////////////////////////////////////////////////////////////////////
initTheme();
initSettings();
autoPaste();

/*
const uaDetection = () => {
  if (/Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor))
    console.log('Chrome detected');
  else if (/Safari/.test(userAgent) && /Apple Computer/.test(navigator.vendor))
    console.log('Safari detected');
  else if (/Firefox/.test(userAgent))
    console.log('Firefox detected');
  else if (/Edge/.test(userAgent))
    console.log('Edge detected');
};

in toggleSubmitBtn:
  //if (!invalidHelp.hasAttribute('hidden'))
  //if (urlInput.validity.valid)
  //  toggleValidity(false);
  //else
  //  toggleValidity(true);

//urlInput.addEventListener('input', toggleSubmitBtn);

// SW
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  console.log({ deferredPrompt });
  installBtn.removeAttribute('hidden');
});
installBtn.addEventListener('click', async () => {
  if (deferredPrompt) {
    console.log('before prompt');
    deferredPrompt.prompt();
    console.log('after prompt');
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    deferredPrompt = null;
    installBtn.setAttribute('hidden', null);
  }
});

const modalManager = {
  closeAll: () => modals.forEach(m => m.close()),
  getOpen: () => [...modals].find(m => m.open),
  closeOpen: () => {
    const open = modalManager.getOpen();
    if (open) open.close();
  }
};

*/
