const html          = document.documentElement;
const urlInput      = document.getElementById('url');
const form          = document.getElementById('form');
const submitButton  = document.getElementById('submit-btn');
const themeToggle   = document.getElementById('theme-toggle');
const clipR         = document.getElementById('clip-r');
const clipW         = document.getElementById('clip-w');
const inputShortURL = document.getElementById('short-url');
const modalShortURL = document.getElementById('modal-short-url');
const copyBtn       = document.getElementById('copy');
const closeBtn      = document.querySelector('[aria-label="Close"]');

//[ FUNC ]/////////////////////////////////////////////////////////////////////
const setTheme = mode => {
  html.setAttribute('data-theme', mode);
  localStorage.setItem('theme', mode);
};

const setInitialTheme = () => {
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

//shortURL.value = `${window.location.href}`;
const selectText = e => e.target.select();

const queryPermissions = async (name) => navigator.permissions.query({ name });

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
  toggleSetting(clipR, 'clip-r', 'clipboard-read');
  toggleSetting(clipW, 'clip-w', 'clipboard-write');
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
    .then(data => {
      const shortURL = `https://2to.co/${data.key}`;
      inputShortURL.value = shortURL;
      modalShortURL.showModal();
      const isClipW = (localStorage.getItem('clip-w') === 'true');
      console.log({ isClipW }, `val: ${inputShortURL.value}`);
      if (isClipW)
        navigator.clipboard.writeText(inputShortURL.value);
      inputShortURL.select();
    });
};

const toggleSubmitBtn = () => {
  if (urlInput.validity.valid)
    submitButton.disabled = false;
  else
    submitButton.disabled = true;
};

const autoPaste = async () => {
  const { state } = await navigator.permissions.query({ name: 'clipboard-read' });
  if (state !== 'granted')
    return null;

  const isClipR = (localStorage.getItem('clip-r') === 'true');
  if (isClipR) {
    const clipContent = await navigator.clipboard.readText();
    urlInput.value = clipContent;
    toggleSubmitBtn();
    urlInput.focus();
  }
};

//[ EventListener - theme ]/////////////////////////////////////////////////////
themeToggle.addEventListener('change', () => {
  if (themeToggle.checked)
    setTheme('light');
  else
    setTheme('dark');
});


//[ EventListener - input ]////////////////////////////////////////////////////
// Event listener to enable/disable submit button based on input value
// validatorjs npm pkg - isURL() func
urlInput.addEventListener('input', toggleSubmitBtn);


//[ EventListener - form submit ]///////////////////////////////////////////////
form.addEventListener('submit', (e) => {
  e.preventDefault();
  addURL();
});

//[ EventListener - clip-r ]////////////////////////////////////////////////////
// NOTE: doesn't work on ffox
clipR.addEventListener('change', async () => {
  await navigator.clipboard.readText()
    .then(() => {
      clipR.checked = true;
      localStorage.setItem('clip-r', 'true');
    })
    .catch(() => {
      clipR.checked = false
      localStorage.setItem('clip-r', 'false');
    });
});

//[ EventListener - clip-w ]////////////////////////////////////////////////////
clipW.addEventListener('change', async () => (
  localStorage.setItem('clip-w', (clipW.checked) ? 'true' : 'false')
));

//[ EventListeners - shortURL ]/////////////////////////////////////////////////
inputShortURL.addEventListener('click', selectText);
inputShortURL.addEventListener('touchstart', selectText);

//[ EventListeners - modal ]////////////////////////////////////////////////////
// Close with a click outside
document.addEventListener('click', (e) => {
  const modalIsVisible = modalShortURL.open;
  if (!modalIsVisible)
    return;
  const modalContent = modalShortURL.querySelector('article');
  const isClickInside = modalContent.contains(e.target);
  if (!isClickInside)
    modalShortURL.close();
});

// Close with Esc key)
document.addEventListener('keydown', (e) => {
  const modalIsVisible = () => modalShortURL.open;
  if (modalIsVisible && (e.key === "Escape"))
    modalShortURL.close();
});

// Close with Close btn
closeBtn.addEventListener('click', () => modalShortURL.close());

// copy Short URL to clipboard
copyBtn.addEventListener('click', () => (
  navigator.clipboard.writeText(inputShortURL.value)
));


//[ MAIN ]/////////////////////////////////////////////////////////////////////
setInitialTheme();
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
//themeToggle.addEventListener('change', () => setTheme(
//  (themeToggle.checked) ? 'light' : 'dark'
//));
*/
