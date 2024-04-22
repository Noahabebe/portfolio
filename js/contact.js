window.redirectToPage = function() {
  window.location.href = "../confirm.html";
}  

function validateForm(e) {
  e.preventDefault();
  const nameField = document.getElementById("name");
  const emailField = document.getElementById("email");
  const commentField = document.getElementById("comment");
  const response = document.getElementById("response");


  let nameValid = nameField.checkValidity() && !(nameField.value == null || nameField.value == "");
  let emailValid = emailField.checkValidity() && !(emailField.value == null || emailField.value == "");
  let commentValid = commentField.checkValidity() && !(commentField.value == null || commentField.value == "");

  if (!nameValid || !emailValid || !commentValid) {
      response.textContent = "Please enter the required information.";
      response.style.color = "red"

      if (!nameValid) {
          nameField.style.borderStyle = "solid"
          nameField.style.borderColor = "red"
      }
      else {
          nameField.style.borderStyle = "none"
          nameField.style.borderColor = ""
      }
      if (!emailValid) {
          emailField.style.borderStyle = "solid"
          emailField.style.borderColor = "red"
      }
      else {
          emailField.style.borderStyle = "none"
          emailField.style.borderColor = ""
      }
      if (!commentValid) {
          commentField.style.borderStyle = "solid"
          commentField.style.borderColor = "red"
      }
      else {
          commentField.style.borderStyle = "none"
          commentField.style.borderColor = ""
      }
  }
  else {
    var name = document.getElementById("name").value;
    var email = document.getElementById("email").value;
    var comment = document.getElementById("comment").value;


    var formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("comment", comment);

    
    fetch("https://noahabebe.github.io/portfolio/send_email.php", {
        method: "POST",
        body: formData
    })
    .then(response => response.text())
    .then(data => {
       
        document.getElementById("response").innerHTML = data;
    })
    .catch(error => {
        console.error("Error:", error);
    });
    window.redirectToPage();
  }
}

document.getElementById("submit").addEventListener("click", validateForm);

