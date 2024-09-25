import { createQuery, createMutation } from "@farfetched/core";
import { createStore, createEvent, sample } from "effector";
import persist from "effector-localstorage";
import { v4 as uuidv4 } from "uuid";

import { DataType } from "../types";

export const $users = createStore<DataType[]>([]);

export const setUsers = createEvent<DataType[]>();
export const addUser = createEvent<DataType>();
export const deleteUser = createEvent<string>();
export const copyUser = createEvent<string>();

const headers = {
  "Content-Type": "application/json",
};

sample({
  clock: setUsers,
  target: $users,
});

sample({
  source: $users,
  clock: addUser,
  fn: (state, user) => [...state, user],
  target: $users,
});

sample({
  source: $users,
  clock: deleteUser,
  fn: (state, key) => {
    const userExists = state.some(user => user.key === key);

    if (!userExists) {
      console.warn(`Пользователь с ключом ${key} не найден`);
      return state;
    }

    return state.filter(user => user.key !== key);
  },
  target: $users,
});


sample({
  source: $users,
  clock: copyUser,
  fn: (state, key) => {
    const userToCopy = state.find(user => user.key === key);

    if (!userToCopy) {
      console.warn(`Пользователь с ключом ${key} не найден для копирования`);
      return state;
    }

    const newUser = { ...userToCopy, key: uuidv4() };
    return [...state, newUser];
  },
  target: $users,
});


export const itemsQuery = createQuery({
  handler: async () => {
    try {
      const response = await fetch("/api/users");
      if (!response.ok) {
        throw new Error("Ошибка при загрузке пользователей");
      }
      return response.json();
    } catch {
      console.error("Ошибка при запросе пользователей");
      throw new Error("Не удалось получить данные пользователей");
    }
  },
});

itemsQuery.finished.success.watch(({ result }) => {
  setUsers(result);
});

itemsQuery.refresh();

export const deleteUserMutation = createMutation({
  handler: async (key: string) => {
    try {
      const response = await fetch(`/api/users/${key}`, {
        method: "DELETE",
        headers,
      });
      if (!response.ok) {
        throw new Error("Ошибка при удалении пользователя");
      }
      return { key };
    } catch {
      console.error("Ошибка при удалении пользователя");
      throw new Error("Не удалось удалить пользователя");
    }
  },
});

deleteUserMutation.finished.success.watch(({ result }) => {
  deleteUser(result.key);
});

export const addUserMutation = createMutation({
  handler: async (userData: Partial<DataType>) => {
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers,
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        throw new Error("Ошибка при добавлении пользователя");
      }
      return response.json();
    } catch {
      console.error("Ошибка при добавлении пользователя");
      throw new Error("Не удалось добавить пользователя");
    }
  },
});

addUserMutation.finished.success.watch(({ result }) => {
  addUser(result);
});

export const copyMutation = createMutation({
  handler: async (userData: Partial<DataType>) => {
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers,
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        throw new Error("Ошибка при копировании пользователя");
      }
      return response.json();
    } catch {
      console.error("Ошибка при копировании пользователя");
      throw new Error("Не удалось скопировать пользователя");
    }
  },
});

copyMutation.finished.success.watch(({ result }) => {
  addUser(result);
});

persist({ store: $users, key: "users" });
