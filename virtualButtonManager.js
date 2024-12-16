const virtualButtonManager = (() => {
    let editMode = false; // 用于存储是否在编辑模式
    let isMoving = false; // 用于跟踪dpad摇杆是否正在移动
    let buttons = [];
    let keyToCreate = null; // 用于存储按下的键
    let pendingClick = null; // 用于存储待处理的点击位置
    
    
    // 提示信息的框
    let messageDiv = document.createElement('div');
    messageDiv.id = "message";
    messageDiv.className = 'message';
    
    // 创建完成按钮
    let completeButton = document.createElement('div');
    completeButton.textContent = '完成';
    completeButton.className = 'completeButton'; // 添加样式类
    completeButton.style.position = 'fixed';
    completeButton.style.top = '10px';
    completeButton.style.right = '10px';
    completeButton.style.padding = '10px';
    completeButton.style.backgroundColor = '#4CAF50'; // 按钮背景颜色
    completeButton.style.color = 'white'; // 按钮文本颜色
    completeButton.style.cursor = 'pointer'; // 鼠标悬停时显示为指针
    completeButton.style.display = 'none'; // 初始隐藏
    completeButton.style.zIndex = 999;

    // 文件上传控件
    let inputButtonsDiv = document.createElement('input');
    inputButtonsDiv.type = "file";
    inputButtonsDiv.accept = ".json";
    inputButtonsDiv.style = "display: none;";
    
    // 拟储存所有按钮的父框
    let parentDiv = null;
    
    const init = (parentID = false) => {
        // 选择父框
        if (parentID) {
            parentDiv = document.getElementById(parentID)
        } else {
            parentDiv = document.body
        }
      
      
        parentDiv.appendChild(messageDiv);
        parentDiv.appendChild(inputButtonsDiv);
        parentDiv.appendChild(completeButton); // 添加完成按钮到文档
        
        // 文件上传监听事件
        inputButtonsDiv.addEventListener('change', handleFileImport);
        
        // 屏幕点击监听事件
        document.body.addEventListener('click', handleBodyClick);

        // 完成按钮点击事件
        completeButton.addEventListener('click', () => {
            toggleRunMode(); // 切换到运行模式
            completeButton.style.display = 'none'; // 隐藏完成按钮
        });

        if (typeof(sendVirtualKey) == "undefined") {
            window.sendVirtualKey = function(keyState, keyName) {
                console.log(`模拟按键: ${keyName} 被 ${keyState} `);
            }
        }
    };

    const toggleEditMode = () => {
        editMode = true;
        showMessage('编辑模式已开启，点击位置生成按钮。');
        completeButton.style.display = 'block'; // 显示完成按钮
        keyToCreate = ''; // 重置按键
        pendingClick = null; // 重置待处理点击位置
    };

    const toggleRunMode = () => {
        editMode = false; // 关闭编辑模式
        updateButtonPosition()
        showMessage('运行模式已开启，按钮将触发事件。');
    };

    const exportButtons = () => {
        const json = JSON.stringify(buttons.map(b => ({
            key: b.key,
            left: parseInt(window.getComputedStyle(b.element,null).left,10) + parseInt(b.element.style.width,10) / 2 + 'px',
            top: parseInt(window.getComputedStyle(b.element,null).top,10) + parseInt(b.element.style.width,10) / 2 + 'px',
            size: b.element.style.width // 保存按钮大小
        })));
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'buttons.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const generateButtons = () => {
        const input = prompt('请输入英文字母及数字：');
        if (input) {
            const characters = input.split('');
            const startX = 100; // 按钮起始位置X
            const startY = 100; // 按钮起始位置Y
            characters.forEach((char, index) => {
                if (/[0-9]/.test(char)) {
                    char = 'Digit' + char
                } else {
                    char = 'Key' + char.toUpperCase()
                }
                createButton(startX + index * 10, startY, char); // 每个按钮间隔10px
            });
            toggleEditMode();
        }
    };
    
    const generateArrowButtons = () => {
        const characters = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
        const startX = 100; // 按钮起始位置X
        const startY = 100; // 按钮起始位置Y
        characters.forEach((char, index) => {
            createButton(startX + index * 10, startY, char); // 每个按钮间隔10px
        });
        toggleEditMode();
    };
    
    const updateButtonPosition = () => {
        // 根据新的坐标更新按钮位置
        buttons.forEach(b => {
            styles = window.getComputedStyle(b.element,null);  // 获得计算样式，计算样式中同时包含left，right
            
            const x = parseInt(styles.left,10) + parseInt(styles.width,10) / 2;
            const y = parseInt(styles.top,10) + parseInt(styles.height,10) / 2;


            // 水平方向
            if (x < window.innerWidth / 2) {

            } else {
                b.element.style.right = `${parseInt(styles.right,10)}px`;
                b.element.style.left = ''; // 清除 left
            }

            // 垂直方向
            if (y < window.innerHeight / 2) {

            } else {
                b.element.style.bottom = `${parseInt(styles.bottom,10)}px`;
                b.element.style.top = ''; // 清除 top
            }
        });
    };

    const importButtons = () => {
        inputButtonsDiv.click();
    };

    const handleFileImport = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const data = JSON.parse(e.target.result);
                loadButtons(data);
            };
            reader.readAsText(file);
        }
    };

    const handleBodyClick = (event) => {
        if (editMode) {
            // 检查是否点击在现有按钮上
            const isButtonClicked = buttons.some(button => {
                const rect = button.element.getBoundingClientRect();
                return (
                    event.clientX >= rect.left &&
                    event.clientX <= rect.right &&
                    event.clientY >= rect.top &&
                    event.clientY <= rect.bottom
                );
            });
    
            if (!isButtonClicked) {
                if (keyToCreate === null) {
                    // 如果没有按键输入，记录点击位置
                    pendingClick = { x: event.clientX, y: event.clientY };
                    showMessage('请按下一个键来创建按钮。');
                    createTemporaryButton(pendingClick.x, pendingClick.y);
                } else {
                    // 在此处重置 keyToCreate 和 pendingClick
                    keyToCreate = null; 
                    pendingClick = null; 
                }
            }
        }
    };

    const createTemporaryButton = (x, y) => {
        const tempButton = document.createElement('div');
        tempButton.className = 'virtualButton';
        tempButton.style.left = `${x - 25}px`; // 位置调整
        tempButton.style.top = `${y - 25}px`;  // 位置调整
        tempButton.textContent = ''; // 临时按钮文本
    
        parentDiv.appendChild(tempButton);
        tempButton.contentEditable = 'true'; // 使文本可编辑
        tempButton.focus(); // 聚焦
    
        tempButton.addEventListener('keydown', (event) => {
            // 捕捉所有按键事件
            keyToCreate = event.code; // 获取按下的键
            showMessage(`将创建按钮: ${keyToCreate}`);
            
            // 创建正式按钮
            createButton(x, y, keyToCreate);
            try {
                parentDiv.removeChild(tempButton); // 移除临时按钮
            } catch {}
            keyToCreate = null; // 重置
            pendingClick = null; // 重置
        });
    
        tempButton.addEventListener('blur', () => {
            try {
                parentDiv.removeChild(tempButton); // 移除临时按钮       
            } catch {}
        });
    }

    const createButton = (x, y, key, size = 50) => {
        const button = document.createElement('div');
        
        // 将按钮位置设置为点击位置的中心
        button.style.left = `${x - size / 2}px`; // 根据大小调整位置
        button.style.top = `${y - size / 2}px`;  // 根据大小调整位置
        button.style.width = `${size}px`;         // 设置按钮宽度
        button.style.height = `${size}px`;        // 设置按钮高度
        button.textContent = key;

        
        if (key == "dpad") {
            button.className = 'dpad_main';
            button.innerHTML = `
        				<div class="dpad_cross">
        						<div class="dpad_vertical">
        								<div class="dpad_bar"></div>
        						</div>
        						<div class="dpad_horizontal">
        								<div class="dpad_bar"></div>
        						</div>
        				</div>
            `
        } else {
            button.className = 'virtualButton';
        }

        let longPressTimer;
        let offsetX, offsetY;

        button.addEventListener('mousedown', (event) => {
            if (editMode) {
                offsetX = event.clientX - button.getBoundingClientRect().left;
                offsetY = event.clientY - button.getBoundingClientRect().top;

                // 开始拖动
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            
                longPressTimer = setTimeout(() => {
                    // 长按3秒钟后删除按钮
                    parentDiv.removeChild(button);
                    buttons = buttons.filter(b => b.element !== button);
                }, 3000); // 3000毫秒 = 3秒
            }
        });

        button.addEventListener('mouseup', () => {
            clearTimeout(longPressTimer); // 取消长按计时器
        });

        button.addEventListener('mouseleave', () => {
            clearTimeout(longPressTimer); // 取消长按计时器
        });

        if (key == "dpad") {
            button.addEventListener('click', (event) => {
                event.stopPropagation(); // 阻止事件冒泡
                if (!editMode) {
                    // 模拟按键事件
                    console.log(`模拟按键: ${key}`);
                    sendVirtualKey("keydown",key);
                }
            });
            
            // 添加触摸事件
            button.addEventListener('touchstart', (event) => {
                if (editMode) {
                    const touch = event.touches[0];
                    offsetX = touch.clientX - button.getBoundingClientRect().left;
                    offsetY = touch.clientY - button.getBoundingClientRect().top;
        
                    document.addEventListener('touchmove', onTouchMove);
                    document.addEventListener('touchend', onTouchEnd);
                    
                    longPressTimer = setTimeout(() => {
                        // 长按3秒钟后删除按钮
                        parentDiv.removeChild(button);
                        buttons = buttons.filter(b => b.element !== button);
                    }, 3000); // 3000毫秒 = 3秒
                } else {
                    console.log(`模拟触屏: ${key}`);
                    sendVirtualKey("keydown",key);
                }
            });
        
            button.addEventListener('touchend', () => {
                if (editMode) {
                    clearTimeout(longPressTimer);
                } else {
                    sendVirtualKey("keyup",key);
                }
            });
        } else {
            button.addEventListener('click', (event) => {
                event.stopPropagation(); // 阻止事件冒泡
                if (!editMode) {
                    // 模拟按键事件
                    console.log(`模拟按键: ${key}`);
                    sendVirtualKey("keydown",key);
                }
            });
            
            // 添加触摸事件
            button.addEventListener('touchstart', (event) => {
                if (editMode) {
                    const touch = event.touches[0];
                    offsetX = touch.clientX - button.getBoundingClientRect().left;
                    offsetY = touch.clientY - button.getBoundingClientRect().top;
        
                    document.addEventListener('touchmove', onTouchMove);
                    document.addEventListener('touchend', onTouchEnd);
                    
                    longPressTimer = setTimeout(() => {
                        // 长按3秒钟后删除按钮
                        parentDiv.removeChild(button);
                        buttons = buttons.filter(b => b.element !== button);
                    }, 2000); // 3000毫秒 = 3秒
                } else {
                    console.log(`模拟触屏: ${key}`);
                    sendVirtualKey("keydown",key);
                }
            });
        
            button.addEventListener('touchend', () => {
                if (editMode) {
                    clearTimeout(longPressTimer);
                } else {
                    sendVirtualKey("keyup",key);
                }
            });
        }

        function onMouseMove(event) {
            if (editMode) {
                button.style.left = `${event.clientX - offsetX}px`;
                button.style.top = `${event.clientY - offsetY}px`;
                button.style.right = '';
                button.style.bottom = '';
                clearTimeout(longPressTimer); // 取消长按计时器
            }
        }
        
        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            clearTimeout(longPressTimer); // 取消长按计时器
        }
    
        function onTouchMove(event) {
            if (editMode) {
                const touch = event.touches[0];
                button.style.left = `${touch.clientX - offsetX}px`;
                button.style.top = `${touch.clientY - offsetY}px`;
                button.style.right = '';
                button.style.bottom = '';
                clearTimeout(longPressTimer); // 取消长按计时器
                event.preventDefault(); // 防止页面滚动
            }
        }
    
        function onTouchEnd() {
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
            clearTimeout(longPressTimer); // 取消长按计时器
        }

        // 添加鼠标滚轮事件来调整按钮大小
        button.addEventListener('wheel', (event) => {
            event.preventDefault(); // 防止页面滚动
            if (editMode) {
                const newSize = Math.max(10, size + (event.deltaY < 0 ? 5 : -5)); // 增加或减少大小
                button.style.width = `${newSize}px`;
                button.style.height = `${newSize}px`;
                button.style.left = `${parseInt(button.style.left) + (size - newSize) / 2}px`; // 调整位置
                button.style.top = `${parseInt(button.style.top) + (size - newSize) / 2}px`; // 调整位置
                size = newSize; // 更新当前大小
            }
        });

        parentDiv.appendChild(button);
        buttons.push({ element: button, key: key, size: size }); // 保存按钮大小
    }
    
    
    const clearButtons = () => {
        // 清空现有按钮
        buttons.forEach(b => parentDiv.removeChild(b.element));
        buttons = [];
    }
    
    
    const loadButtons = (data) => {
        // 重新创建按钮
        data.forEach(item => {
            createButton(
                parseInt(item.left, 10),
                parseInt(item.top, 10),
                item.key,
                parseInt(item.size, 10) // 加载按钮大小
            );
        });
        
        updateButtonPosition();
    };

    const showMessage = (message) => {
        messageDiv.textContent = message;
        messageDiv.style.display = 'block'; // 显示消息
        setTimeout(() => {
            messageDiv.style.display = 'none'; // 3秒后隐藏消息
        }, 3000);
    };

    return {
        init,
        toggleEditMode,
        toggleRunMode,
        generateButtons,
        generateArrowButtons,
        exportButtons,
        importButtons,
        clearButtons,
        createButton,
        buttons
    };
})();
