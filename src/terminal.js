import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal as TerminalIcon, ChevronRight, Folder, FileText } from 'lucide-react';

const fileSystem = {
  '~': {
    type: 'directory',
    content: {
      'about.txt': {
        type: 'file',
        content: `Samuel Lefcourt
--------------
PhD Candidate in Computer Science
Specializing in AI for Public Health and Security
Contact: slefcourt12@gmail.com
Location: Baltimore, MD`
      },
      'education': {
        type: 'directory',
        content: {
          'phd.txt': {
            type: 'file',
            content: `PhD in Computer Science (AI Focus)
Johns Hopkins University
Expected: May 2025
- Whiting School of Engineering Dean's Fellow
- Research: AI reliability and public health applications`
          },
          'masters.txt': {
            type: 'file',
            content: `MS in Computer Science (Machine Learning)
Southern Methodist University
2020-2021
- GPA: 4.0`
          }
        }
      },
      'skills.txt': {
        type: 'file',
        content: `Technical Skills
--------------
Languages: Python, C++, Java, JavaScript
ML/AI: TensorFlow, PyTorch, Keras
Cloud: AWS, Docker, Kubernetes
Development: React, Node.js, GraphQL`
      },
      'publications': {
        type: 'directory',
        content: {
          'paper1.txt': {
            type: 'file',
            content: `Title: Leveraging AI for Early Pandemic Detection
Publication: Journal of Public Health Tech
Year: 2023`
          }
        }
      }
    }
  }
};

const Terminal = () => {
  const [history, setHistory] = useState([]);
  const [currentPath, setCurrentPath] = useState(['~']);
  const [inputValue, setInputValue] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const inputRef = useRef(null);
  const outputRef = useRef(null);
  const terminalRef = useRef(null);

  const navigateFileSystem = useCallback((path) => {
    let current = fileSystem['~'];
    const parts = path.split('/').filter(p => p && p !== '~');
    
    for (const part of parts) {
      if (!current.content || !current.content[part] || current.content[part].type !== 'directory') {
        return null;
      }
      current = current.content[part];
    }
    return current;
  }, []);

  const getCurrentDirectory = useCallback(() => {
    return navigateFileSystem(currentPath.join('/'));
  }, [currentPath, navigateFileSystem]);

  const commands = {
    help: () => ({
      output: `Available Commands:
------------------
help     - Show this help message
clear    - Clear the terminal
ls       - List directory contents
cd       - Change directory
cat      - View file contents
pwd      - Show current path
whoami   - Display user info

Examples:
ls
cat about.txt
cd education
pwd`,
      type: 'success'
    }),
    
    clear: () => {
      setHistory([]);
      return { output: '', type: 'success' };
    },
    
    ls: (args) => {
      const target = args.length ? navigateFileSystem(args[0]) : getCurrentDirectory();
      if (!target) return { output: `ls: directory not found: ${args[0]}`, type: 'error' };
      if (target.type !== 'directory') return { output: `ls: not a directory: ${args[0]}`, type: 'error' };
      
      return {
        output: Object.entries(target.content).map(([name, item]) => ({
          name,
          type: item.type,
          icon: item.type === 'directory' ? <Folder className="w-4 h-4" /> : <FileText className="w-4 h-4" />
        })),
        type: 'files'
      };
    },
    
    cat: (args) => {
      if (!args.length) return { output: 'Usage: cat <filename>', type: 'error' };
      
      const dir = getCurrentDirectory();
      if (!dir) return { output: 'Error: Invalid directory', type: 'error' };
      
      const file = dir.content[args[0]];
      if (!file) return { output: `File not found: ${args[0]}`, type: 'error' };
      if (file.type === 'directory') return { output: `Error: ${args[0]} is a directory`, type: 'error' };
      
      return { output: file.content, type: 'content' };
    },
    
    cd: (args) => {
      if (!args.length || args[0] === '~') {
        setCurrentPath(['~']);
        return { output: '', type: 'success' };
      }
      
      if (args[0] === '..') {
        if (currentPath.length > 1) {
          setCurrentPath(prev => prev.slice(0, -1));
        }
        return { output: '', type: 'success' };
      }
      
      const dir = getCurrentDirectory();
      if (!dir) return { output: 'Error: Invalid directory', type: 'error' };
      
      const target = dir.content[args[0]];
      if (!target) return { output: `Directory not found: ${args[0]}`, type: 'error' };
      if (target.type !== 'directory') return { output: `Not a directory: ${args[0]}`, type: 'error' };
      
      setCurrentPath(prev => [...prev, args[0]]);
      return { output: '', type: 'success' };
    },
    
    pwd: () => ({
      output: `/${currentPath.join('/')}`,
      type: 'success'
    }),
    
    whoami: () => ({
      output: 'visitor - Guest User',
      type: 'success'
    })
  };

  const handleCommand = (input) => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const [cmd, ...args] = trimmedInput.split(' ');
    const command = commands[cmd];
    
    const result = command 
      ? command(args)
      : { output: `Command not found: ${cmd}`, type: 'error' };

    setHistory(prev => [...prev, { input: trimmedInput, ...result }]);
    setCommandHistory(prev => [...prev, trimmedInput]);
    setHistoryIndex(prev => prev + 1);
    setInputValue('');
    setShowSuggestions(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCommand(inputValue);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex > 0) {
        setHistoryIndex(prev => prev - 1);
        setInputValue(commandHistory[historyIndex - 1]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        setHistoryIndex(prev => prev + 1);
        setInputValue(commandHistory[historyIndex + 1]);
      } else {
        setHistoryIndex(commandHistory.length);
        setInputValue('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleTabCompletion();
    }
  };

  const handleTabCompletion = () => {
    const [cmd] = inputValue.split(' ');
    const availableCommands = Object.keys(commands);
    const matches = availableCommands.filter(c => c.startsWith(cmd));
    
    if (matches.length === 1) {
      setInputValue(matches[0] + ' ');
      setShowSuggestions(false);
    } else if (matches.length > 1) {
      setSuggestions(matches);
      setShowSuggestions(true);
    }
  };

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    focusInput();
    const terminal = terminalRef.current;
    terminal?.addEventListener('click', focusInput);
    return () => terminal?.removeEventListener('click', focusInput);
  }, [focusInput]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  const renderOutput = (entry) => {
    switch (entry.type) {
      case 'files':
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {entry.output.map(({name, icon, type}) => (
              <div key={name} className="flex items-center space-x-2">
                <span className={type === 'directory' ? 'text-blue-400' : 'text-gray-300'}>
                  {icon}
                </span>
                <span className={type === 'directory' ? 'text-blue-400' : 'text-gray-300'}>
                  {name}
                </span>
              </div>
            ))}
          </div>
        );
      case 'error':
        return <div className="text-red-400">{entry.output}</div>;
      case 'content':
      case 'success':
        return <div className="whitespace-pre-wrap text-gray-300">{entry.output}</div>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
      <div 
        ref={terminalRef}
        className="max-w-4xl mx-auto bg-gray-800 rounded-lg shadow-xl overflow-hidden border border-gray-700"
      >
        <div className="bg-gray-900 p-3 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center">
            <TerminalIcon className="w-5 h-5 mr-2 text-green-500" />
            <span className="text-sm font-medium">Terminal CV</span>
          </div>
          <div className="flex space-x-2">
            <button className="w-3 h-3 rounded-full bg-red-500" />
            <button className="w-3 h-3 rounded-full bg-yellow-500" />
            <button className="w-3 h-3 rounded-full bg-green-500" />
          </div>
        </div>
        
        <div 
          ref={outputRef}
          className="p-4 h-[80vh] overflow-y-auto font-mono text-sm bg-gray-900"
        >
          <div className="mb-4 text-green-400">
            Welcome to Samuel Lefcourt's Terminal CV!
            Type 'help' for available commands.
          </div>
          
          {history.map((entry, i) => (
            <div key={i} className="mb-3">
              <div className="flex items-center text-green-500 mb-1">
                <ChevronRight className="w-4 h-4 mr-1" />
                <span className="text-purple-400">{currentPath.join('/')}</span>
                <span className="ml-1">$</span>
                <span className="ml-2 text-gray-100">{entry.input}</span>
              </div>
              {renderOutput(entry)}
            </div>
          ))}

          <div className="flex items-center mt-2 group">
            <ChevronRight className="w-4 h-4 mr-1 text-green-500" />
            <span className="text-purple-400">{currentPath.join('/')}</span>
            <span className="text-green-500 ml-1">$</span>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 ml-2 bg-transparent outline-none text-gray-100 focus:outline-none"
              autoFocus
              spellCheck="false"
              autoComplete="off"
            />
          </div>
          
          {showSuggestions && suggestions.length > 0 && (
            <div className="mt-2 ml-6 p-2 bg-gray-800 rounded border border-gray-700">
              {suggestions.map((suggestion) => (
                <div key={suggestion} className="text-gray-300 hover:text-white cursor-pointer"
                     onClick={() => {
                       setInputValue(suggestion + ' ');
                       setShowSuggestions(false);
                       focusInput();
                     }}>
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Terminal;
