var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var PORT = process.env.PORT || 3000;
var mongoose = require("mongoose");
// require("dotenv").config();

// connection to the db
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost/todo", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));

// user Schema
var userSchema = new mongoose.Schema({
  useremail: { type: String, unique: true },
  password: { type: String },
  username: { type: String },
});

// todo-item Schema
var todoSchema = new mongoose.Schema({
  name: String,
  dueDate: Date,
  label: String,
  userEmail: String,
  completed: String,
  priority: Number,
});

var isUserLoggedIn = false;

var Todo = mongoose.model("Todo", todoSchema);
var User = mongoose.model("myuser", userSchema);
// var CompleteTodo = mongoose.model("completeTodo", todoSchema);
var msg = "";
var CurrentUser;

// ---------- Routes ----------------

// login page
app.get("/login_page", (req, res) => {
  isUserLoggedIn = false;
  CurrentUser = new User();
  res.render("loginpage.ejs", { alertmsg: "" });
});

//Register Page
app.get("/register_page", (req, res) => {
  isUserLoggedIn = false;
  CurrentUser = new User();
  res.render("registerpage.ejs");
});

// Register the User
app.post("/register", (req, res) => {
  var newUser = new User({
    useremail: req.body.useremail,
    username: req.body.username,
    password: req.body.password,
  });
  // storing the details of the user
  User.create(newUser, (err, newUser) => {
    if (err) {
      console.log(err);
    } else {
      console.log("new user added !!" + newUser);
      res.redirect("/login_page");
    }
  });
});

//loginAuth for the user
app.post("/userhome", (req, res) => {
  User.findOne(
    { useremail: req.body.useremail, password: req.body.password },
    (err, user) => {
      if (err) {
        console.log(err);
      }
      if (!user) {
        res.render("loginpage.ejs", { alertmsg: "INVALID CREDENTIALS" });
      } else {
        CurrentUser = new User({
          useremail: user.useremail,
          username: user.username,
          password: user.password,
        });
        isUserLoggedIn = true;
        res.render("userhome.ejs", { user: CurrentUser });
      }
    }
  );
});

// user profile
app.get("/profile", (req, res) => {
  if (!isUserLoggedIn) {
    res.redirect("/");
  } else {
    Todo.find({ userEmail: CurrentUser.useremail }, (err, toDoList) => {
      if (err) {
        console.log(err);
      } else {
        var total_task = toDoList.length;
        var task_completed = 0;
        for (var i = 0; i < toDoList.length; i++) {
          if (toDoList[i].completed == "True") {
            task_completed = task_completed + 1;
          }
        }
        res.render("userProfile.ejs", {
          user: CurrentUser,
          toDoList: toDoList,
          total_task: total_task,
          task_completed: task_completed,
        });
      }
    });
  }
});

// Home page
app.get("/", (req, res) => {
  isUserLoggedIn = false;
  CurrentUser = new User();
  res.render("home.ejs");
});

// User Home Page after login
app.get("/userhome", (req, res) => {
  if (isUserLoggedIn) {
    res.render("userhome.ejs", { user: CurrentUser });
  } else {
    res.redirect("/login_page");
  }
});

//Create New Task
app.get("/newTask", (req, res) => {
  if (isUserLoggedIn) {
    msg = "";
    res.render("newTask.ejs", { alertmsg: msg, user: CurrentUser });
  } else {
    res.redirect("/login_page");
  }
});

// Submit task
app.post("/newTask", (req, res) => {
  var newItem = new Todo({
    name: req.body.item,
    dueDate: req.body.dueDate,
    label: req.body.label,
    userEmail: CurrentUser.useremail,
    completed: false,
    priority: parseInt(req.body.Priority, 10),
  });
  // if the user has not entered all the values
  if (newItem.name == "") {
    msg = "Task Name is Required !!!";
    res.render("newTask", { alertmsg: msg });
    console.log("Incomplete fileds");
  } else if (newItem.dueDate == null) {
    msg = "Due Date is Required !!!";
    res.render("newTask", { alertmsg: msg });
    console.log("Incomplete fileds");
  } else if (newItem.priority == null) {
    msg = "Set Priority !!!";
    res.render("newTask", { alertmsg: msg });
    console.log("Incomplete fileds");
  } else {
    // adding the task to the db
    Todo.create(newItem, (err, newItem) => {
      if (err) {
        console.log(err);
      } else {
        console.log("new task added !!" + newItem);
        res.redirect("/userhome");
      }
    });
  }
});

// showing the tasks
app.get("/showTasks", (req, res) => {
  if (isUserLoggedIn) {
    // console.log(CurrentUser.useremail);
    Todo.find({ userEmail: CurrentUser.useremail }, (err, toDoList) => {
      if (err) {
        console.log(err);
      } else {
        console.log(toDoList);
        res.render("showTasks.ejs", { toDoList: toDoList });
      }
    });
  } else {
    res.redirect("/login_page");
  }
});

// change the status of the task
app.post("/showTasks", (req, res) => {
  if (isUserLoggedIn) {
    var taskID = req.body.taskid;
    if (taskID == undefined || taskID == "") {
      console.log("INVALID TASK ID");
      res.redirect("/showTasks");
    } else {
      Todo.findByIdAndUpdate(
        { _id: taskID },
        { $set: { completed: "True" } },
        (err, doneTask) => {
          if (err) {
            //console.log(err);
            msg = "Invalid Task ID (# " + taskID + ")";
            res.render("newTask", { alertmsg: msg });
          } else {
            // console.log("Remove " + doneTask);
            Todo.find({ userEmail: CurrentUser.useremail }, (err, toDoList) => {
              if (err) {
                console.log(err);
                res.redirect("/userhome");
              } else {
                console.log(toDoList);
                res.render("showTasks.ejs", { toDoList: toDoList });
              }
            });
          }
        }
      );
    }
  } else {
    res.redirect("/login_page");
  }
});

//serach a task get
app.get("/serachByLabel", (req, res) => {
  if (!isUserLoggedIn) {
    res.redirect("/");
  } else {
    res.redirect("/userhome");
  }
});
//searching the tasks post
app.post("/serachByLabel", (req, res) => {
  if (!isUserLoggedIn) {
    res.redirect("/");
  } else {
    var taskLabel = req.body.taskLabel;
    var taskName = req.body.taskName;

    Todo.find({ userEmail: CurrentUser.useremail }, (err, toDoList) => {
      if (err) {
        console.log(err);
      } else {
        res.render("searchTaskByLabel.ejs", {
          toDoList: toDoList,
          taskLabel: taskLabel,
          taskName: taskName,
        });
      }
    });
  }
});

app.get("/sortedTasks", (req, res) => {
  if (!isUserLoggedIn) {
    res.redirect("/");
  } else {
    res.redirect("/userhome");
  }
});

function GetSortOrder(prop) {
  return function (a, b) {
    if (a[prop] > b[prop]) {
      return 1;
    } else if (a[prop] < b[prop]) {
      return -1;
    }
    return 0;
  };
}

function GetSortByDueDate(prop) {
  return function (a, b) {
    return new Date(a[prop]) - new Date(b[prop]);
  };
}

app.post("/sortedTasks", (req, res) => {
  if (!isUserLoggedIn) {
    res.redirect("/");
  } else {
    Todo.find({ userEmail: CurrentUser.useremail }, (err, toDoList) => {
      if (err) {
        console.log(err);
      } else {
        // console.log(toDoList);
        var sortingCatagory = req.body.sortingCatagory;
        if (sortingCatagory == "dueDate") {
          toDoList.sort(GetSortByDueDate(sortingCatagory));
        } else {
          toDoList.sort(GetSortOrder(sortingCatagory));
        }
        res.render("sortedTask.ejs", {
          toDoList: toDoList,
          sortingCatagory: sortingCatagory,
        });
      }
    });
  }
});

// Catch all other routers
app.get("*", (req, res) => {
  res.render("invalidpage.ejs");
});

app.listen(PORT, () => {
  console.log(`server started at ${PORT}`);
});
