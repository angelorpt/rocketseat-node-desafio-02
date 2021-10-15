const express = require("express");
const cors = require("cors");

const { v4: uuidv4, validate } = require("uuid");

const app = express();
app.use(express.json());
app.use(cors());

const users = [];

// Users Functions
//--------------------

function getUserByUsername(username) {
  const user = users.find((user) => user.username === username);
  return user;
}

function getUserById(id) {
  const user = users.find((user) => user.id === id);
  return user;
}

function existsUserAccountByUsername(username) {
  return users.some((user) => user.username === username);
}

function existsUserAccountById(id) {
  return users.some((user) => user.id === id);
}

// Todos Functions
//-------------------
function getAllTodosByUsername(username) {
  if (!existsUserAccountByUsername(username)) {
    return false;
  }

  const user = getUserByUsername(username);
  return user.todos;
}

function getAllTodosByUserId(id) {
  if (!existsUserAccountById(id)) {
    return false;
  }

  const user = getUserById(id);
  return user.todos;
}

function existsTodoByTodoId(username, id) {
  if (!existsUserAccountByUsername(username)) {
    return false;
  }

  const todos = getAllTodosByUsername(username);
  return todos.some((todo) => todo.id === id);
}

function getTodoById(username, id) {
  if (!existsUserAccountByUsername(username)) return false;
  if (!existsTodoByTodoId(username, id)) return false;

  const todos = getAllTodosByUsername(username);
  return todos.find((todo) => todo.id === id);
}

// Middlewares
//-----------------

function checksExistsUserAccount(req, res, next) {
  const { username } = req.headers;
  // return res.status(400).json({ error: "Username já está sendo usado" });
  if (!existsUserAccountByUsername(username)) {
    return res.status(404).json({ error: "User não encontrado" });
  }

  const user = getUserByUsername(username);
  req.user = user;

  return next();
}

function checksCreateTodosUserAvailability(req, res, next) {
  const { user } = req;
  const total = user.todos.length;
  if (user.pro === true || (user.pro === false && total < 10)) {
    next();
  } else {
    res.status(403).json({ error: "Não é possível criar um novo ToDo" });
  }
}

function checksTodoExists(req, res, next) {
  const { username } = req.headers;
  const { id } = req.params;

  if (!validate(id)) {
    return res.status(400).json({ error: "ID não válido" });
  }

  const userExists = existsUserAccountByUsername(username);
  if (!userExists) {
    return res.status(404).json({ error: "User não cadastrado" });
  }

  const todoExists = existsTodoByTodoId(username, id);
  if (!todoExists) {
    return res.status(404).json({ error: "ToDo não cadastrado" });
  }

  const user = getUserByUsername(username);
  const todo = getTodoById(username, id);
  req.user = user;
  req.todo = todo;
  next();
}

function findUserById(req, res, next) {
  const { id } = req.params;

  if (!existsUserAccountById(id)) {
    res.status(404).json({ error: "Usuário não encontrado" });
  }

  const user = getUserById(id);
  if (!user) return false;
  req.user = user;
  next();
}

// USER
//-----------

app.get("/users", (req, res) => {
  return res.json(users);
});

app.get("/users/:id", findUserById, (req, res) => {
  const { user } = req;

  return res.json(user);
});

app.post("/users", (req, res) => {
  const { name, username } = req.body;

  const usernameAlreadyExists = users.some(
    (user) => user.username === username
  );

  if (usernameAlreadyExists) {
    return res.status(400).json({ error: "Username already exists" });
  }

  const user = {
    id: uuidv4(),
    name,
    username,
    pro: false,
    todos: [],
  };

  users.push(user);

  return res.status(201).json(user);
});

app.patch("/users/:id/pro", findUserById, (req, res) => {
  const { user } = req;

  if (user.pro) {
    return response
      .status(400)
      .json({ error: "Pro plan is already activated." });
  }

  user.pro = true;

  return res.json(user);
});

// TODOS
//---------

app.get("/todos", checksExistsUserAccount, (req, res) => {
  const { user } = req;

  return res.json(user.todos);
});

app.get(
  "/todos/:id",
  [checksExistsUserAccount, checksTodoExists],
  (req, res) => {
    const { todo } = req;
    return res.json(todo);
  }
);

app.post(
  "/todos",
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  (req, res) => {
    const { title, deadline } = req.body;
    const { user } = req;

    const newTodo = {
      id: uuidv4(),
      title,
      deadline: new Date(deadline),
      done: false,
      created_at: new Date(),
    };

    user.todos.push(newTodo);

    return res.status(201).json(newTodo);
  }
);

app.put("/todos/:id", checksTodoExists, (req, res) => {
  const { title, deadline } = req.body;
  const { todo } = req;

  todo.title = title;
  todo.deadline = new Date(deadline);

  return res.json(todo);
});

app.patch("/todos/:id/done", checksTodoExists, (req, res) => {
  const { todo } = req;

  todo.done = true;

  return res.json(todo);
});

app.delete(
  "/todos/:id",
  checksExistsUserAccount,
  checksTodoExists,
  (req, res) => {
    const { user, todo } = req;

    const todoIndex = user.todos.indexOf(todo);

    if (todoIndex === -1) {
      return res.status(404).json({ error: "Todo not found" });
    }

    user.todos.splice(todoIndex, 1);

    return res.status(204).send();
  }
);

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById,
};
