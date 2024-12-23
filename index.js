////////////////////////////////////////////* Functions *////////////////////////////////////////////

function unlockAllTopics()
{
    const lockedTopics = document.querySelectorAll('.topic-button.locked');
    lockedTopics.forEach(topic => {
        topic.classList.remove('locked');
    });
}

////////////////////////////////////////////* Async Functions *////////////////////////////////////////////

async function selectTopic(fileName, firstVideoName, secondVideoName)
{
    const topicButton = event.target;
    if (topicButton.classList.contains('locked'))
    {
        document.getElementById('modal-overlay').style.display = 'flex';
        return;
    }
    try
    {
        const fileUrl = `Topics/${fileName}`;
        const response = await fetch(fileUrl);

        if (!response.ok)
        {
            throw new Error(`Error fetching file: ${response.status}`);
        }

        const markdownText = await response.text();
        localStorage.setItem('topic', markdownText);
        localStorage.setItem('video1', firstVideoName);
        localStorage.setItem('video2', secondVideoName);

        if (window.location.pathname.includes('indexRU.html'))
        {
            window.location.href = 'topicRU.html';
        }
        else
        {
            window.location.href = 'topic.html';
        }
    }
    catch (error)
    {
        console.error("Error:", error);
    }
}

async function checkUserPayment()
{
    const tg = window.Telegram.WebApp;

    const user = tg.initDataUnsafe?.user;
    if (user)
    {
        try
        {
            const response = await fetch('https://sapphireboxingserver.almandine.ch:443/check-user-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({id: user})
            });

            if (!response.ok)
            {
                throw new Error(`HTTP Error: ${response.status}`);
            }

            const data = await response.json();
            const userExists = data.exists;

            if (userExists)
            {
                unlockAllTopics();
            }
        }
        catch (error)
        {
            console.error("Error:", error);
        }
    }
}

async function createPaymentLink()
{
    try
    {
        const response = await fetch('https://sapphireboxingserver.almandine.ch:443/generate-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        const data = await response.json();
        if (data.invoiceLink)
        {
            if (window.Telegram && window.Telegram.WebApp)
            {
                window.Telegram.WebApp.openInvoice(data.invoiceLink);
                window.Telegram.WebApp.onEvent('invoiceClosed', async (event) => {
                        document.getElementById('modal-overlay').style.display = 'none';
                        await checkUserPayment();
                });
            }
            else
            {
                window.open(data.invoiceLink, "_blank");
            }
        }
        else
        {
            console.error("Error creating payment link:", data.error);
        }
    }
    catch (error)
    {
        console.error("Error performing request:", error);
    }
}

////////////////////////////////////////////* Events *////////////////////////////////////////////

document.addEventListener('DOMContentLoaded', async () => {
    if (window.location.pathname.endsWith('/topic.html') || window.location.pathname.endsWith('/topicRU.html'))
    {
        window.Telegram.WebApp.BackButton.show();

        if(window.location.pathname.endsWith('/topic.html'))
        {
            window.Telegram.WebApp.BackButton.onClick(() => {
                window.location.href = 'index.html';
            });
        }
        else
        {
            window.Telegram.WebApp.BackButton.onClick(() => {
                window.location.href = 'indexRU.html';
            });
        }

        const responseElement = document.getElementById('response-text');
        const responseText = localStorage.getItem('topic');

        if (responseText)
        {
            responseElement.innerHTML = marked.parse(responseText);
            const codeBlocks = responseElement.querySelectorAll('pre code');
            codeBlocks.forEach((block) => {
                hljs.highlightElement(block);
            });
        }
        else
        {
            responseElement.innerText = "No topic.";
        }

        const firstVideoName = localStorage.getItem('video1');
        const secondVideoName = localStorage.getItem('video2');

        const firstVideoContainer = document.querySelector('.first-video-container video source');
        if (firstVideoContainer && firstVideoName) {
            firstVideoContainer.setAttribute('src', `Video/${firstVideoName}`);
            firstVideoContainer.parentElement.load();
        }

        const secondVideoContainer = document.querySelector('.second-video-container video source');
        if (secondVideoContainer && secondVideoName) {
            secondVideoContainer.setAttribute('src', `Video/${secondVideoName}`);
            secondVideoContainer.parentElement.load();
        }

        const questionEditor = CodeMirror.fromTextArea(document.getElementById('question'), { theme: 'playground', lineWrapping: true, indentWithTabs: false, indentUnit: 0 });

        const questionWrapper = questionEditor.getWrapperElement();
        questionWrapper.style.fontFamily = '"Courier New", Courier, monospace';
        questionWrapper.style.fontSize = '17px';
        questionWrapper.style.padding = '2px';
        questionWrapper.style.height = '300px';

        const askButton = document.getElementById('ask-button');
        askButton.addEventListener('click', async () => {
            const topic = localStorage.getItem('topic');
            const question = questionEditor.getValue();
            const fullQuestion = `Topic: ${topic}\nQuestion: ${question}`;

            try
            {
                const response = await fetch('https://sapphireboxingserver.almandine.ch:443/ask', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ question: fullQuestion })
                });

                if (!response.ok)
                {
                    throw new Error(`HTTP Error: ${response.status}`);
                }

                const data = await response.json();
                const answer = data.answer || "Error with getting data";
                questionEditor.setValue(answer);
            }
            catch (error)
            {
                console.error("Error:", error);
            }
        })
    }
    else
    {
        window.Telegram.WebApp.BackButton.hide();
        await checkUserPayment();
    }
});

let lastScrollY = 0;

window.addEventListener("scroll", function () {
    const currentScrollY = window.scrollY || window.pageYOffset;

    if (Math.abs(currentScrollY - lastScrollY) > 50)
    {
        document.activeElement.blur();
    }

    lastScrollY = currentScrollY;
});

const extraSpace = document.createElement('div');
extraSpace.style.height = '300px';
extraSpace.style.visibility = 'hidden';
document.body.appendChild(extraSpace);

document.addEventListener('focusin', (event) => {
    const element = event.target.closest('.input-output, .CodeMirror');

    if (element)
    {
        const viewportHeight = window.innerHeight;
        const elementRect = element.getBoundingClientRect();
        const elementBottom = elementRect.bottom + window.scrollY;
        const scrollPosition = elementBottom - viewportHeight / 2;

        window.scrollTo(
            {
            top: scrollPosition,
            behavior: 'smooth'
        });
    }
});

document.addEventListener('focusout', () => {});

document.getElementById("wallet-button").addEventListener("click", createPaymentLink);

document.getElementById('modal-overlay').addEventListener('click', function(event) {
    if (event.target === this)
    {
        document.getElementById('modal-overlay').style.display = 'none';
    }
});
