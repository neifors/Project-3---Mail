window.onpopstate = function(event){
    if(event.dataset.section){
        load_mailbox(event.state.section)
    }
}

//? --------- WHEN DOM CONTENT IS LOADED ------------
document.addEventListener('DOMContentLoaded', function() {
    // Use buttons to toggle between views
    document.querySelectorAll(".sections").forEach( button => {
        button.onclick = e => {
        const section = e.target.dataset.section
        history.pushState({section:section}, "", `${section}`)
        load_mailbox(section)
        }
    });

    document.querySelector('#compose').addEventListener('click', e => {
        const section = e.target.dataset.section
        history.pushState({section:section}, "", `${section}`)
        compose_email()
    });

    // By default, load the inbox
    load_mailbox("inbox")
});

//? --------- COMPOSE EMAIL ------------
function compose_email(recipient="", body="", subject="", timestamp="") {
    // Show compose view and hide other views
    document.querySelector('#emails-view').style.display = 'none';
    document.querySelector('#compose-view').style.display = 'block';


    const sendEmail = event => {
        event.preventDefault()
        const options = {
        method: 'POST',
        body: JSON.stringify({
            recipients: event.target["recipient"].value,
            subject: event.target["subject"].value,
            body: event.target["body"].value
        })
        }
        fetch('/emails', options)
        .then( response => response.json())
        .then( result => {
            if(result.message === 'Email sent successfully.'){
                history.pushState({section:"sent"}, "", `sent`)
                load_mailbox("sent")
            } else {
                document.querySelector("#error-sending-email").textContent = result.error
            }
            })
    }
    
    // Add Event Listener to the form
    document.querySelector("#compose-form").addEventListener("submit", sendEmail)

    // Clear out composition fields
    document.querySelector('#compose-recipients').value = recipient ? recipient: '';
    if(subject && subject.includes("Re:")){
        replySubjec = subject.replace("Re:", "")
    } else {
        replySubjec = subject
    }
    document.querySelector('#compose-subject').value = subject ? `Re: ${replySubjec}` : '';
    document.querySelector('#compose-body').value = recipient && body && timestamp ? `On ${timestamp} ${recipient} wrote: \n ${body} \n ________________________\n` : '';
}

//? --------- LOAD MAILBOX ------------
function load_mailbox(mailbox) {
    const emailsTag = document.querySelector('#emails-view')

    // Show the mailbox and hide other views
    emailsTag.style.display = 'block';
    document.querySelector('#compose-view').style.display = 'none';

    // Show the mailbox name
    emailsTag.innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

    fetch(`/emails/${mailbox}`)
        .then(response => response.json())
        .then(emails => {
            if(emails.length){
                emails.forEach(email => {
                const mainWrapper = document.createElement("div")
                mainWrapper.className = "email-wrapper"
                if( email.read ) {
                    mainWrapper.classList.add("unread")
                }
                const subWrapper = document.createElement("div")
                subWrapper.className = "sender-subject-wrapper"
                subWrapper.style.alignItems = "center"
                const sender = document.createElement("p")
                sender.className = "sender"
                sender.textContent = email.sender
                sender.dataset.email = email
                sender.onclick = () => {
                    history.pushState({section:email.id}, "", `email?id=${email.id}`)
                    if( !email.read ){
                        handleRead(email)
                    }
                    renderEmail(email)
                    }
                const subject = document.createElement("span")
                subject.className = "subject"
                subject.textContent = email.subject
                const dateArchive = document.createElement('div')
                dateArchive.style.display = 'flex'
                dateArchive.style.alignItems = "center"
                const timestamp = document.createElement("p")
                timestamp.className = "timestamp"
                timestamp.textContent = email.timestamp

                sender.appendChild(subject)
                subWrapper.appendChild(sender)
                mainWrapper.appendChild(subWrapper)
                dateArchive.appendChild(timestamp)
                if( mailbox !== "sent" ){
                    const archive = document.createElement("img")
                    archive.type = "icon"
                    archive.className = "archive-icon"
                    archive.src = mailbox === "archived" ? "https://th.bing.com/th/id/R.fbd6fc2bf57cdba608169268438e4092?rik=%2btRVqDy1PCzU9A&pid=ImgRaw&r=0" : "https://i.ibb.co/X8KW2Th/archive-1.png"
                    archive.style.width = "25px"
                    archive.style.height = "25px"
                    archive.onclick = event => {
                        const element = event.target
                        element.parentElement.parentElement.style.animationPlayState = "running"
                        element.parentElement.parentElement.addEventListener('animationend', () => handleArchive(email))
                    }
                    dateArchive.appendChild(archive)
                }
                mainWrapper.appendChild(dateArchive)
                emailsTag.appendChild(mainWrapper)
                })
            }
    });
}

//? --------- HANDLE ARCHIVE ------------
async function handleArchive(email) {
    await fetch(`/emails/${email.id}`, {
        method: 'PUT',
        body: JSON.stringify({
            archived: email.archived ? false : true
        })
    })
    load_mailbox("inbox")
}

//? --------- HANDLE READ ------------
function handleRead(email){
    fetch(`/emails/${email.id}`, {
        method: 'PUT',
        body: JSON.stringify({
            read: true
        })
    })
}

//? --------- RENDER EMAIL ------------
function renderEmail(email) {
    // Clean section first
    const emailsTag = document.querySelector('#emails-view')
    emailsTag.innerHTML = ""

    // Create elements to build the specific email structure
    const mainWrapper = document.createElement("div")
    mainWrapper.className = "email-details-wrapper"
    const from = document.createElement("p")
    from.className = "title"
    from.textContent = "From: "
    const fromValue = document.createElement("span")
    fromValue.textContent = email.sender
    from.appendChild(fromValue)
    const to = document.createElement("p")
    to.className = "title"
    to.textContent = "To: "
    const toValue = document.createElement("span")
    toValue.textContent = email.recipients
    to.appendChild(toValue)
    const subject = document.createElement("p")
    subject.className = "title"
    subject.textContent = "Subject: "
    const subjectValue = document.createElement("span")
    subjectValue.textContent = email.subject
    subject.appendChild(subjectValue)
    const timestamp = document.createElement("p")
    timestamp.className = "title"
    timestamp.textContent = "Timestamp: "
    const timestampValue = document.createElement("span")
    timestampValue.textContent = email.timestamp
    timestamp.appendChild(timestampValue)
    const reply = document.createElement("button")
    reply.textContent = "Reply"
    reply.classList = "btn btn-sm btn-outline-primary"
    reply.onclick = () => {
        compose_email(email.sender, email.body, email.subject, email.timestamp)
    }
    const hr = document.createElement("hr")
    
    mainWrapper.appendChild(from)
    mainWrapper.appendChild(to)
    mainWrapper.appendChild(subject)
    mainWrapper.appendChild(timestamp)
    mainWrapper.appendChild(reply)
    mainWrapper.appendChild(hr)

    const lines = email.body.split("\n")
    if(lines.length > 1){
        lines.forEach( line => {
            const newLine = document.createElement("p")
            newLine.textContent = line
            mainWrapper.appendChild(newLine)
        })
    } else {
        const message = document.createElement("p")
        message.textContent =  email.body
        mainWrapper.appendChild(message)
    }
    emailsTag.appendChild(mainWrapper)
}
