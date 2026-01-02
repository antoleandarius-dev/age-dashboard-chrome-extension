// ============================================
// TODO MANAGER MODULE
// ============================================

import { storage } from './storage.js';
import { STORAGE_KEYS } from '../utils/constants.js';
import { dom } from '../ui/domManager.js';

export class TodoManager {
    constructor() {
        this.todos = [];
        this.listeners = new Set();
    }

    async initialize() {
        const data = await storage.get(STORAGE_KEYS.TODOS);
        if (data[STORAGE_KEYS.TODOS]) {
            this.todos = data[STORAGE_KEYS.TODOS];
        }
        return this.todos;
    }

    getTodos() {
        return [...this.todos];
    }

    async addTodo(text) {
        const todo = {
            id: Date.now(),
            text: text.trim(),
            completed: false
        };
        this.todos.push(todo);
        await this.saveTodos();
        this.notifyListeners('todo-added', todo);
        return todo;
    }

    async toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            await this.saveTodos();
            this.notifyListeners('todo-toggled', todo);
            return todo.completed;
        }
        return false;
    }

    async deleteTodo(id) {
        const index = this.todos.findIndex(t => t.id === id);
        if (index !== -1) {
            const deleted = this.todos.splice(index, 1)[0];
            await this.saveTodos();
            this.notifyListeners('todo-deleted', deleted);
            return true;
        }
        return false;
    }

    async clearAll() {
        this.todos = [];
        await this.saveTodos();
        this.notifyListeners('todos-cleared', null);
    }

    getCompleted() {
        return this.todos.filter(t => t.completed);
    }

    getPending() {
        return this.todos.filter(t => !t.completed);
    }

    getStats() {
        return {
            total: this.todos.length,
            completed: this.getCompleted().length,
            pending: this.getPending().length
        };
    }

    render() {
        const todoList = dom.get('todoList');
        if (!todoList) return;
        if (this.todos.length === 0) {
            todoList.innerHTML = '<p style="text-align: center; opacity: 0.7; padding: 1rem;">No tasks yet. Add one above!</p>';
            return;
        }
        todoList.innerHTML = this.todos.map(todo => `
            <li class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
                <span class="todo-text">${this.escapeHtml(todo.text)}</span>
                <div class="todo-actions">
                    <button class="todo-toggle" data-id="${todo.id}">${todo.completed ? '↩' : '✓'}</button>
                    <button class="todo-delete" data-id="${todo.id}">🗑</button>
                </div>
            </li>
        `).join('');
    }

    export() {
        return JSON.stringify(this.todos, null, 2);
    }

    async import(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            if (Array.isArray(imported)) {
                this.todos = imported;
                await this.saveTodos();
                this.notifyListeners('todos-imported', imported);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to import todos:', error);
            return false;
        }
    }

    async saveTodos() {
        await storage.set(STORAGE_KEYS.TODOS, this.todos);
    }

    onChange(callback) {
        this.listeners.add(callback);
    }

    offChange(callback) {
        this.listeners.delete(callback);
    }

    notifyListeners(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Error in todo listener:', error);
            }
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

export const todoManager = new TodoManager();
