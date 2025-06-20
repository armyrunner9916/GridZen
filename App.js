import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Dimensions,
  Modal,
  Switch,
  Platform,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { Audio } from 'expo-av';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Color generation function
const generateDistinctColors = (count) => {
  const colors = [];
  const hueStep = 360 / count;
  
  for (let i = 0; i < count; i++) {
    const hue = (i * hueStep + Math.random() * 30) % 360;
    const saturation = 70 + Math.random() * 30;
    const lightness = 45 + Math.random() * 20;
    colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
  }
  
  return colors.sort(() => Math.random() - 0.5);
};

// Game component
const GridZenGame = () => {
  const [gameState, setGameState] = useState('splash');
  const [gridSize, setGridSize] = useState(3);
  const [grid, setGrid] = useState([]);
  const [targetGrid, setTargetGrid] = useState([]);
  const [selectedTile, setSelectedTile] = useState(null);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [playerName, setPlayerName] = useState('');
  const [highScores, setHighScores] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showHighScores, setShowHighScores] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState('3x3');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // Refs
  const timerRef = useRef(null);
  const gameOverSound = useRef(null);
  const victorySound = useRef(null);

  // Load sounds
  const loadSounds = async () => {
    try {
    // Only attempt to set audio mode on native platforms
      if (Platform.OS !== 'web') {
       try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            staysActiveInBackground: false,
          });
        } catch (audioError) {
        console.log('Audio setup failed:', audioError);
        }
      }

     console.log('Loading sounds...');

      try {
        const { sound: gameOver } = await Audio.Sound.createAsync(
          require('./assets/sounds/Game_over.mp3')
        );
        const { sound: victory } = await Audio.Sound.createAsync(
          require('./assets/sounds/Cheer.mp3')
        );

        gameOverSound.current = gameOver;
        victorySound.current = victory;

        console.log('Sounds loaded successfully');
      } catch (loadError) {
        console.log('Note: Sounds may not work in iOS Simulator with Expo Go');
        console.log('They will work on physical devices and in production builds');
      }

    } catch (error) {
      console.log('Unexpected error during sound setup:', error);
    }
  };

  // Play sound helper
  const playSound = async (soundType) => {
    if (!soundEnabled) return;
    
    try {
      if (soundType === 'gameover' && gameOverSound.current) {
        await gameOverSound.current.replayAsync();
      } else if (soundType === 'victory' && victorySound.current) {
        await victorySound.current.replayAsync();
      }
    } catch (error) {
      console.log('Error playing sound:', error);
    }
  };

  // Theme colors
  const theme = {
    background: isDarkMode ? '#1a1a1a' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#000000',
    tile: isDarkMode ? '#2a2a2a' : '#f0f0f0',
    selectedTile: '#4CAF50',
    button: isDarkMode ? '#333333' : '#e0e0e0',
    buttonText: isDarkMode ? '#ffffff' : '#000000',
    input: isDarkMode ? '#333333' : '#f5f5f5',
    inputText: isDarkMode ? '#ffffff' : '#000000',
    border: isDarkMode ? '#444444' : '#cccccc',
  };

  // Time limits based on grid size
  const getTimeLimit = (size) => {
    const timeLimits = {
      3: 30,
      4: 60,
      5: 90,
      6: 120,
    };
    return timeLimits[size];
  };

  // Initialize game and load data
  useEffect(() => {
    loadInitialData();
    loadSounds();
    
    // Cleanup
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      unloadSounds();
    };
  }, []);

  // Load initial data
  const loadInitialData = async () => {
    try {
      // Load saved data
      const savedScores = await AsyncStorage.getItem('gridzen_highscores');
      if (savedScores) setHighScores(JSON.parse(savedScores));
      
      const savedName = await AsyncStorage.getItem('gridzen_playername');
      if (savedName) setPlayerName(savedName);
      
      const savedDarkMode = await AsyncStorage.getItem('darkMode');
      if (savedDarkMode !== null) setIsDarkMode(JSON.parse(savedDarkMode));
      
      const savedSound = await AsyncStorage.getItem('soundOn');
      if (savedSound !== null) setSoundEnabled(JSON.parse(savedSound));
      
      // Start splash animation - wait 3 seconds before starting fade
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }).start(() => {
          // Reset the animation value to 1 BEFORE changing state
          fadeAnim.setValue(1);
          setGameState('menu');
        });
      }, 3000); // 3 seconds before starting fade
    } catch (error) {
      console.log('Loading data succeeded');
      // Still transition to menu even if there's an error
      setTimeout(() => {
        fadeAnim.setValue(1);
        setGameState('menu');
      }, 3000);
    }
  };

  // Unload sounds
  const unloadSounds = async () => {
    try {
      if (gameOverSound.current) {
        await gameOverSound.current.unloadAsync();
      }
      if (victorySound.current) {
        await victorySound.current.unloadAsync();
      }
    } catch (error) {
      console.log('Error unloading sounds:', error);
    }
  };

  // Timer effect
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameState === 'playing') {
      handleGameOver();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeLeft, gameState]);

  // Save settings
  const saveSettings = async () => {
    await AsyncStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    await AsyncStorage.setItem('soundOn', JSON.stringify(soundEnabled));
  };

  // Save high scores
  const saveHighScores = async (scores) => {
    try {
      await AsyncStorage.setItem('gridzen_highscores', JSON.stringify(scores));
    } catch (error) {
      // Storage error - scores saved in memory only
    }
  };

  // Save player name
  const savePlayerName = async (name) => {
    try {
      await AsyncStorage.setItem('gridzen_playername', name);
    } catch (error) {
      // Storage error - name saved in memory only
    }
  };

  // Initialize grid
  const initializeGrid = () => {
    const size = gridSize * gridSize;
    const colors = generateDistinctColors(size);
    const numbers = Array.from({ length: size }, (_, i) => i + 1);
    
    // Create target grid (numbers in order)
    const target = [];
    for (let i = 0; i < gridSize; i++) {
      target[i] = [];
      for (let j = 0; j < gridSize; j++) {
        target[i][j] = {
          number: i * gridSize + j + 1,
          color: colors[i * gridSize + j],
        };
      }
    }
    setTargetGrid(target);

    // Create shuffled grid
    const shuffled = numbers.sort(() => Math.random() - 0.5);
    const newGrid = [];
    for (let i = 0; i < gridSize; i++) {
      newGrid[i] = [];
      for (let j = 0; j < gridSize; j++) {
        const index = i * gridSize + j;
        newGrid[i][j] = {
          number: shuffled[index],
          color: colors[shuffled[index] - 1],
        };
      }
    }
    setGrid(newGrid);
  };

  // Start game
  const startGame = () => {
    if (!playerName.trim()) {
      Alert.alert('Name Required', 'Please enter your name to continue.');
      return;
    }
    savePlayerName(playerName);
    setGameState('playing');
    setMoves(0);
    setTimeLeft(getTimeLimit(gridSize));
    setSelectedTile(null);
    initializeGrid();
  };

  // Handle tile press
  const handleTilePress = (row, col) => {
    if (gameState !== 'playing') return;

    if (!selectedTile) {
      // First selection
      setSelectedTile({ row, col });
    } else {
      const { row: selRow, col: selCol } = selectedTile;
      
      // Check if clicking the same tile (deselect)
      if (row === selRow && col === selCol) {
        setSelectedTile(null);
        return;
      }
      
      // Check if adjacent (up-down, left-right only)
      const isAdjacent = 
        (Math.abs(row - selRow) === 1 && col === selCol) ||
        (Math.abs(col - selCol) === 1 && row === selRow);

      if (isAdjacent) {
        // Swap tiles
        const newGrid = [...grid];
        const temp = newGrid[row][col];
        newGrid[row][col] = newGrid[selRow][selCol];
        newGrid[selRow][selCol] = temp;
        
        setGrid(newGrid);
        setMoves(moves + 1);
        setSelectedTile(null);
        
        // Check win condition
        if (checkWin(newGrid)) {
          handleWin();
        }
      } else {
        // Select new tile if not adjacent
        setSelectedTile({ row, col });
      }
    }
  };

  // Check win condition
  const checkWin = (currentGrid) => {
    let expectedNumber = 1;
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        if (currentGrid[i][j].number !== expectedNumber) {
          return false;
        }
        expectedNumber++;
      }
    }
    return true;
  };

  // Handle win
  const handleWin = () => {
    setGameState('won');
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    // Update high scores
    const scoreKey = `${gridSize}x${gridSize}`;
    const newScore = {
      name: playerName,
      moves: moves,
      timeRemaining: timeLeft,
      date: new Date().toLocaleDateString(),
    };
    
    const updatedScores = { ...highScores };
    if (!updatedScores[scoreKey]) {
      updatedScores[scoreKey] = [];
    }
    
    updatedScores[scoreKey].push(newScore);
    updatedScores[scoreKey].sort((a, b) => a.moves - b.moves);
    updatedScores[scoreKey] = updatedScores[scoreKey].slice(0, 5);
    
    setHighScores(updatedScores);
    saveHighScores(updatedScores);
    
    // Play victory sound
    playSound('victory');
    
    Alert.alert(
      'Congratulations!',
      `You won in ${moves} moves with ${timeLeft} seconds remaining!`,
      [{ text: 'OK', onPress: () => setGameState('menu') }]
    );
  };

  // Handle game over
  const handleGameOver = () => {
    setGameState('gameOver');
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    // Play game over sound
    playSound('gameover');
    
    Alert.alert(
      'Time\'s Up!',
      'You ran out of time. Try again!',
      [{ text: 'OK', onPress: () => setGameState('menu') }]
    );
  };

  // Reset all high scores
  const resetHighScores = () => {
    Alert.alert(
      'Reset High Scores',
      'Are you sure you want to delete all high scores? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setHighScores({});
            await AsyncStorage.removeItem('gridzen_highscores');
            Alert.alert('Success', 'All high scores have been reset.');
          },
        },
      ]
    );
  };

  // Render tile
  const renderTile = (tile, row, col) => {
    const isSelected = selectedTile && selectedTile.row === row && selectedTile.col === col;
    const tileSize = (screenWidth - 60) / gridSize - 10;
    
    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        style={[
          styles.tile,
          {
            backgroundColor: tile.color,
            width: tileSize,
            height: tileSize,
            borderColor: isSelected ? theme.selectedTile : theme.border,
            borderWidth: isSelected ? 3 : 1,
          },
        ]}
        onPress={() => handleTilePress(row, col)}
      >
        <Text style={[styles.tileText, { color: theme.text }]}>{tile.number}</Text>
      </TouchableOpacity>
    );
  };

  // Render high scores modal
  const renderHighScoresModal = () => {
    const scores = highScores[selectedDifficulty] || [];
    
    return (
      <Modal
        visible={showHighScores}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHighScores(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>High Scores</Text>
            
            <TouchableOpacity
              style={[styles.resetButton, { backgroundColor: '#ff4444' }]}
              onPress={resetHighScores}
            >
              <Text style={[styles.resetButtonText, { color: '#ffffff' }]}>Reset All Scores</Text>
            </TouchableOpacity>
            
            <View style={[styles.pickerContainer, { backgroundColor: theme.input }]}>
              <Picker
                selectedValue={selectedDifficulty}
                onValueChange={setSelectedDifficulty}
                style={{ color: theme.inputText }}
              >
                <Picker.Item label="3x3" value="3x3" />
                <Picker.Item label="4x4" value="4x4" />
                <Picker.Item label="5x5" value="5x5" />
                <Picker.Item label="6x6" value="6x6" />
              </Picker>
            </View>
            
            <ScrollView style={styles.scoresContainer}>
              {scores.length > 0 ? (
                scores.map((score, index) => (
                  <View key={index} style={[styles.scoreRow, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.scoreRank, { color: theme.text }]}>#{index + 1}</Text>
                    <View style={styles.scoreInfo}>
                      <Text style={[styles.scoreName, { color: theme.text }]}>{score.name}</Text>
                      <Text style={[styles.scoreDetails, { color: theme.text }]}>
                        {score.moves} moves • {score.timeRemaining}s left
                      </Text>
                      <Text style={[styles.scoreDate, { color: theme.text, opacity: 0.7 }]}>
                        {score.date}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={[styles.noScores, { color: theme.text }]}>
                  No high scores yet for {selectedDifficulty}
                </Text>
              )}
            </ScrollView>
            
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.button }]}
              onPress={() => setShowHighScores(false)}
            >
              <Text style={[styles.buttonText, { color: theme.buttonText }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Render menu
  const renderMenu = () => {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text }]}>GridZen</Text>
        
        <View style={styles.controls}>
          <View style={styles.controlRow}>
            <Text style={[styles.controlLabel, { color: theme.text }]}>Dark Mode</Text>
            <Switch
              value={isDarkMode}
              onValueChange={(value) => {
                setIsDarkMode(value);
                saveSettings();
              }}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={isDarkMode ? '#f5dd4b' : '#f4f3f4'}
            />
          </View>
          
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: theme.button }]}
            onPress={() => setShowHighScores(true)}
          >
            <Text style={[styles.buttonText, { color: theme.buttonText }]}>View High Scores</Text>
          </TouchableOpacity>
          
          <View style={styles.controlRow}>
            <Text style={[styles.controlLabel, { color: theme.text }]}>
              Sounds {soundEnabled ? '🔔' : '🔕'}
            </Text>
            <Switch
              value={soundEnabled}
              onValueChange={(value) => {
                setSoundEnabled(value);
                saveSettings();
              }}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={soundEnabled ? '#f5dd4b' : '#f4f3f4'}
            />
          </View>
        </View>
        
        <View style={styles.menuContent}>
          <Text style={[styles.instructions, { color: theme.text }]}>
            Rearrange the tiles to place numbers in order from 1 to {gridSize * gridSize},
            reading left to right, top to bottom.
          </Text>
          
          <Text style={[styles.instructions, { color: theme.text }]}>
            You can only swap adjacent tiles (up-down, left-right).
          </Text>
          
          <TextInput
            style={[styles.input, { backgroundColor: theme.input, color: theme.inputText }]}
            placeholder="Enter your name"
            placeholderTextColor={isDarkMode ? '#999' : '#666'}
            value={playerName}
            onChangeText={setPlayerName}
          />
          
          <Text style={[styles.label, { color: theme.text }]}>Select Grid Size:</Text>
          
          <View style={styles.sizeButtons}>
            {[3, 4, 5, 6].map((size) => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.sizeButton,
                  {
                    backgroundColor: gridSize === size ? theme.selectedTile : theme.button,
                  },
                ]}
                onPress={() => setGridSize(size)}
              >
                <Text
                  style={[
                    styles.sizeButtonText,
                    {
                      color: gridSize === size ? '#ffffff' : theme.buttonText,
                    },
                  ]}
                >
                  {size}x{size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={[styles.timeLimit, { color: theme.text }]}>
            Time Limit: {getTimeLimit(gridSize)} seconds
          </Text>
          
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: theme.selectedTile }]}
            onPress={startGame}
          >
            <Text style={[styles.startButtonText, { color: '#ffffff' }]}>Start Game</Text>
          </TouchableOpacity>
        </View>
        
        {renderHighScoresModal()}
      </View>
    );
  };

  // Render game
  const renderGame = () => {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Text style={[styles.headerText, { color: theme.text }]}>Moves: {moves}</Text>
          <Text style={[styles.headerText, { color: theme.text }]}>Time: {timeLeft}s</Text>
        </View>
        
        <View style={styles.gridContainer}>
          {grid.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((tile, colIndex) => renderTile(tile, rowIndex, colIndex))}
            </View>
          ))}
        </View>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.button }]}
          onPress={() => {
            if (timerRef.current) {
              clearTimeout(timerRef.current);
            }
            playSound('gameover');
            setGameState('menu');
          }}
        >
          <Text style={[styles.buttonText, { color: theme.buttonText }]}>Give Up</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render splash screen
  const renderSplash = () => {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
        <Animated.Image 
          source={require('./assets/splash.png')} 
          style={{
            opacity: fadeAnim,
            width: screenWidth,
            height: screenHeight,
          }}
          resizeMode="contain"
        />
      </View>
    );
  };

  // Main render
  if (gameState === 'splash') {
    return renderSplash();
  }
  
  return gameState === 'menu' ? renderMenu() : renderGame();
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  controls: {
    marginBottom: 20,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  controlLabel: {
    fontSize: 16,
  },
  controlButton: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  menuContent: {
    alignItems: 'center',
  },
  instructions: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  input: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  label: {
    fontSize: 18,
    marginBottom: 10,
  },
  sizeButtons: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  sizeButton: {
    padding: 15,
    margin: 5,
    borderRadius: 8,
    minWidth: 60,
  },
  sizeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  timeLimit: {
    fontSize: 16,
    marginBottom: 20,
  },
  startButton: {
    padding: 15,
    borderRadius: 8,
    minWidth: 200,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  gridContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  row: {
    flexDirection: 'row',
  },
  tile: {
    margin: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  tileText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignSelf: 'center',
    minWidth: 150,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    padding: 20,
    borderRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  resetButton: {
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  pickerContainer: {
    borderRadius: 8,
    marginBottom: 20,
    overflow: 'hidden',
  },
  scoresContainer: {
    maxHeight: 300,
    marginBottom: 20,
  },
  scoreRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  scoreRank: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 15,
    width: 30,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  scoreDetails: {
    fontSize: 14,
    marginTop: 2,
  },
  scoreDate: {
    fontSize: 12,
    marginTop: 2,
  },
  noScores: {
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
});

export default GridZenGame;