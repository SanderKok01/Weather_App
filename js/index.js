// Get the API key
async function getApiKey() {
  const res = await fetch('key.json').catch(console.error);
  return (await res.json()).keys[0].value
}

// Reusable API call based on city
async function callCity(city) {
  const key = await getApiKey();
  const res = await fetch(`http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${key}&units=metric`)
  .catch(console.error);
  return await res.json();
};

// Reusable API call based on Coords
async function callCoords(latitude, longitude) {
  const key = await getApiKey();
  const res = await fetch(`http://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${key}&units=metric`);
  return await res.json();
};

// Resuable API call to get the flag
function getFlag(country) {
  return `https://www.countryflags.io/${country}/flat/64.png`;
}

// Toggle the details for temprature
function toggleDetails(trigger) {
  trigger.classList.toggle("active");
  const content = trigger.nextElementSibling;
  if (content.style.maxHeight){
    content.style.maxHeight = null;
    content.style.borderTop = null;
  } else {
    content.style.maxHeight = content.scrollHeight + "px";
    content.style.borderTop = "2px solid #b60868";
  }
}

// If location has been recieved
function success(pos) {
  new WeatherCard(null, pos, false);
}

// If location has failed
function error(err) {
  return console.error(err.code, err.message);
}

// If the form has been submitted
async function handleSubmit(event) {
  event.preventDefault();

  // Get all data needed
  const inputVal = document.querySelector('[data-input="city"]').value;
  let currentCards = JSON.parse(window.localStorage.getItem("cards"));
  const verifyData = await callCity(inputVal);

  // Check if there is data existing in localStorage
  if (!currentCards) {
    currentCards = [];
  };

  // Reset the input value
  document.querySelector('[data-input="city"]').value = "";

  // Check if the city exists
  if (currentCards.includes(inputVal) || currentCards.includes(verifyData.name)) {
    return alert("403: City already exists.");
  };

  // Check if inputValue is equal to current location
  if (document.querySelector('.location_wrapper[data-wrapper-index="0"]').querySelector('.location').textContent === verifyData.name) {
    return alert("403: IT ALREADY EXISTS!! >:|");
  }

  // Else, create a card
  new WeatherCard(inputVal, null, true);
}

// WeatherIndex is 0 when initialized
let weatherIndex = 0;

// Dynamic class for creating Cards using the JSON file
class WeatherCard {
  constructor(city, pos, saving) {
    // Set variables
    let wrapperCreated = false;
    let func = Function;
    let canBeDeleted = Boolean;

    // Check which API type needs to be called
    if (city) {
      func = callCity(city);
      canBeDeleted = true;
    } else if (pos) {
      func = callCoords(pos.coords.latitude, pos.coords.longitude);
      canBeDeleted = false;
    }

    // Function after recieving data
    func.then((dataset) => {
      // Check for errors
      if (dataset.cod === "404" || dataset.cod === "403" && dataset.message) {
        return alert(`${dataset.cod}: ${dataset.message}`);
      };

      // Create request for JSON with elements
      const xobj = new XMLHttpRequest();
      xobj.overrideMimeType("application/json");
      xobj.open('GET', 'js/defaultCardStructure.json', true);
      xobj.onreadystatechange = async function() {
        if (xobj.readyState == 4 && xobj.status == "200") {
          const elementList = await JSON.parse(xobj.responseText).elements;

          // Set element
          elementList.forEach((element, index) => {
            const reusableElement = document.createElement(element.type);
            reusableElement.classList.add(element.classes);

            if (element.other_attributes) {
              element.other_attributes.forEach((att, index) => {
                for (let index = 0; index < att.data.length; index++) {
                  reusableElement.setAttribute(att.data[index].prop, att.data[index].value);
                };
              });
            };

            // Set text
            if (element.text_content) {
              reusableElement.innerHTML = `${element.text_content}`;
            }

            // Replace text
            if (reusableElement.getAttribute('data-changeable')) {
              switch (reusableElement.getAttribute('data-changeable')) {
                case "location":
                  reusableElement.innerHTML = dataset.name;
                  break;
                case "temp":
                  reusableElement.innerHTML = `${Math.round(dataset.main.temp)}`;
                  break;
                case "details_temp":
                  reusableElement.innerHTML = `${dataset.main.temp} °C`;
                  break;
                case "details_feels_like":
                  reusableElement.innerHTML = `${dataset.main.feels_like} °C`;
                  break;
                case "details_min_wrapper":
                  reusableElement.innerHTML = `${dataset.main.temp_min} °C`;
                  break;
                case "details_max_wrapper":
                  reusableElement.innerHTML = `${dataset.main.temp_max} °C`;
                  break;
                default:
                  console.error(element);
                  throw new Error(`Unexpected error happend while Switching Cases! Index: ${index}`);
              };
            };

            // Set img src
            if (element.type === "img") {
              switch (reusableElement.getAttribute("data-src-set")) {
                case "flag":
                  const flagSrc = getFlag(dataset.sys.country);
                  reusableElement.setAttribute("src", flagSrc);
                  reusableElement.setAttribute("title", dataset.sys.country);
                  break;
                case "icon":
                  const iconSrc = `http://openweathermap.org/img/wn/${dataset.weather[0].icon}@2x.png`;
                  reusableElement.setAttribute("src", iconSrc);
                  reusableElement.setAttribute("title", dataset.weather[0].description);
                  break;
                default:
                  throw new Error(`Failed to load icon. Index: ${index} | On <data-src-set> ${reusableElement.getAttribute("data-src-set")}`);
              };
            };

            // Check index
            if (element.parent_class === "location_wrapper") {
              wrapperCreated = true;
            }

            // Set attribute
            reusableElement.setAttribute("data-wrapper-index", weatherIndex);

            if (!canBeDeleted && element.type === "button" && element.classes === "del-button") {
              return;
            }

            // Generate elements
            if (wrapperCreated === true) {
              return document.querySelector(`[data-wrapper-index="${weatherIndex}"].${element.parent_class}`).appendChild(reusableElement);
            } else {
              return document.querySelector(`.${element.parent_class}`).appendChild(reusableElement);
            };
          });

          // Increase index for every card
          weatherIndex++;
        };
      };
      xobj.send(null);

      if (saving) {
        saveToStorage(dataset.name);
      };
    });
  };
};

// Save the city processed by the Class
function saveToStorage(city) {
  let cards = Array;
  if (!window.localStorage.getItem("cards")) {
    cards = [];
  } else {
    cards = JSON.parse(window.localStorage.getItem("cards"));
  };

  cards.push(city);
  window.localStorage.setItem("cards", JSON.stringify(cards));
};

// Load all cities from the localStorage
function loadFromStorage() {
  if (!window.localStorage.getItem("cards")) {
    return null;
  } else {
    const cities = JSON.parse(window.localStorage.getItem("cards"));
    cities.forEach(city => {
      setTimeout(function() {
        new WeatherCard(city);
      }, 250)
    });
  };
};

// Delete the card from localStorage and view when clicked on the deleteButton
function deleteCard(el) {
  // Get all cards
  let cards = JSON.parse(window.localStorage.getItem("cards"));

  // Get the item of the index from where the event is triggerd.
  const index = Number.parseInt(el.getAttribute('data-wrapper-index'));

  // Get the wrapper element
  const wrapper = document.querySelector(`div.location_wrapper[data-wrapper-index="${index}"]`);

  // Get the city name from the wrapper
  const cityname = wrapper.querySelector('p.location').textContent;

  // Remove the city name from the localStorage
  cards.splice(index, 1);
  window.localStorage.setItem('cards', JSON.stringify(cards));

  // Remove the element from the DOM
  return wrapper.remove();
};

// Load functions when body is loading
document.body.onload = async function() {
  await navigator.geolocation.getCurrentPosition(success, error, { timeout: 10000 });
  loadFromStorage();
}
