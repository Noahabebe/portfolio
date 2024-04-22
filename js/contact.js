window.redirectToPage = function() {
  window.location.href = "../confirm.html";
}  

function validateForm(e) {
  e.preventDefault();
  const name = document.getElementById("name");
  const email = document.getElementById("email");
  const comment = document.getElementById("comment");
  const response = document.getElementById("response");

  let nameValid = name.checkValidity() && !(name.value == null || name.value == "");
  let emailValid = email.checkValidity() && !(email.value == null || email.value == "");
  let commentValid = comment.checkValidity() && !(comment.value == null || comment.value == "");

  if (!nameValid || !emailValid || !commentValid) {
      response.textContent = "Please enter the required information.";
      response.style.color = "red"

      if (!nameValid) {
          name.style.borderStyle = "solid"
          name.style.borderColor = "red"
      }
      else {
          name.style.borderStyle = "none"
          name.style.borderColor = ""
      }
      if (!emailValid) {
          email.style.borderStyle = "solid"
          email.style.borderColor = "red"
      }
      else {
          email.style.borderStyle = "none"
          email.style.borderColor = ""
      }
      if (!commentValid) {
          comment.style.borderStyle = "solid"
          comment.style.borderColor = "red"
      }
      else {
          comment.style.borderStyle = "none"
          comment.style.borderColor = ""
      }
  }
  else {
      window.redirectToPage();
      response.textContent = "Your response has been recorded.";
      response.style.color = "rgba(0, 0, 0, 0.5)"
  }
}

document.getElementById("submit").addEventListener("click", validateForm);