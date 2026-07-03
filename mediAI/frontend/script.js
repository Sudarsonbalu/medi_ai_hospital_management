fetch("http://127.0.0.1:8002/")
.then(response => response.json())
.then(data => console.log(data));
fetch("http://127.0.0.1:8002/")
.then(response => response.json())
.then(data => {
    console.log(data);
    document.getElementById("apiMessage").innerHTML =
    data.message;
});