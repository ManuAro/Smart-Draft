import React, { createContext, useContext, useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'

export type FileType = 'file' | 'folder'

export interface FileSystemItem {
    id: string
    name: string
    type: FileType
    parentId: string | null
    content?: any // For files: the exercise data (statement, canvas state, etc.)
    createdAt: number
    updatedAt: number
}

interface FileSystemContextType {
    items: FileSystemItem[]
    currentFolderId: string | null
    setCurrentFolderId: (id: string | null) => void
    createFolder: (name: string) => void
    createFile: (name: string, content: any) => string
    deleteItem: (id: string) => void
    renameItem: (id: string, newName: string) => void
    moveItem: (id: string, newParentId: string | null) => void
    saveFile: (id: string, content: any) => void
    getFile: (id: string) => FileSystemItem | undefined
}

const FileSystemContext = createContext<FileSystemContextType | undefined>(undefined)

export const useFileSystem = () => {
    const context = useContext(FileSystemContext)
    if (!context) {
        throw new Error('useFileSystem must be used within a FileSystemProvider')
    }
    return context
}

export const FileSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<FileSystemItem[]>(() => {
        const saved = localStorage.getItem('smart-draft-filesystem')
        return saved ? JSON.parse(saved) : []
    })
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)

    useEffect(() => {
        localStorage.setItem('smart-draft-filesystem', JSON.stringify(items))
    }, [items])

    const createFolder = (name: string) => {
        const newFolder: FileSystemItem = {
            id: uuidv4(),
            name,
            type: 'folder',
            parentId: currentFolderId,
            createdAt: Date.now(),
            updatedAt: Date.now()
        }
        setItems(prev => [...prev, newFolder])
    }

    const createFile = (name: string, content: any) => {
        const newFile: FileSystemItem = {
            id: uuidv4(),
            name,
            type: 'file',
            parentId: currentFolderId,
            content,
            createdAt: Date.now(),
            updatedAt: Date.now()
        }
        setItems(prev => [...prev, newFile])
        return newFile.id
    }

    const deleteItem = (id: string) => {
        // Recursive delete for folders
        const deleteRecursive = (itemId: string, currentItems: FileSystemItem[]): FileSystemItem[] => {
            const item = currentItems.find(i => i.id === itemId)
            if (!item) return currentItems

            let newItems = currentItems.filter(i => i.id !== itemId)

            if (item.type === 'folder') {
                const children = currentItems.filter(i => i.parentId === itemId)
                children.forEach(child => {
                    newItems = deleteRecursive(child.id, newItems)
                })
            }
            return newItems
        }

        setItems(prev => deleteRecursive(id, prev))
    }

    const renameItem = (id: string, newName: string) => {
        setItems(prev => prev.map(item =>
            item.id === id
                ? { ...item, name: newName, updatedAt: Date.now() }
                : item
        ))
    }

    const moveItem = (id: string, newParentId: string | null) => {
        setItems(prev => prev.map(item =>
            item.id === id
                ? { ...item, parentId: newParentId, updatedAt: Date.now() }
                : item
        ))
    }

    const saveFile = (id: string, content: any) => {
        setItems(prev => prev.map(item =>
            item.id === id
                ? { ...item, content, updatedAt: Date.now() }
                : item
        ))
    }

    const getFile = (id: string) => items.find(i => i.id === id)

    return (
        <FileSystemContext.Provider value={{
            items,
            currentFolderId,
            setCurrentFolderId,
            createFolder,
            createFile,
            deleteItem,
            renameItem,
            moveItem,
            saveFile,
            getFile
        }}>
            {children}
        </FileSystemContext.Provider>
    )
}
