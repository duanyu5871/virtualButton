const virtualButtonManager = (() => {
    let editMode = false; // 用于存储是否在编辑模式
    let isMoving = false; // 用于跟踪dpad摇杆是否正在移动
    let activeTouchId = null; // 用于跟踪活动的触摸点
    let buttons = []; // 存放所有的按键
    let keyToCreate = null; // 用于存储按下的键
    let pendingClick = null; // 用于存储待处理的点击位置
    let overlayDiv = null; // 用于存储覆盖全屏的div


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
    completeButton.style.zIndex = '999';

    // 创建清空按钮
    let clearButton = document.createElement('div');
    clearButton.textContent = '清空'; // 按钮文本
    clearButton.className = 'clearButton'; // 添加样式类
    clearButton.style.position = 'fixed';
    clearButton.style.top = '10px';
    clearButton.style.right = '80px'; // 调整位置，使其在完成按钮左侧
    clearButton.style.padding = '10px';
    clearButton.style.backgroundColor = '#4CAF50'; // 按钮背景颜色
    clearButton.style.color = 'white'; // 按钮文本颜色
    clearButton.style.cursor = 'pointer'; // 鼠标悬停时显示为指针
    clearButton.style.display = 'none'; // 初始隐藏
    clearButton.style.zIndex = '999';

    // 文件上传控件
    let inputButtonsDiv = document.createElement('input');
    inputButtonsDiv.type = "file";
    inputButtonsDiv.accept = ".json";
    inputButtonsDiv.style = "display: none;";

    // 拟储存所有按钮的父框
    let parentDiv = null;
    let dpadDiv = null;

    const init = (parentID = false) => {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = './stylesheets/virtualButtonManager.css';

        // 将 link 元素添加到 head 中
        document.head.appendChild(link);

        // 选择父框
        if (parentID) {
            parentDiv = document.getElementById(parentID);
        } else {
            parentDiv = document.body;
        }

        parentDiv.appendChild(messageDiv);
        parentDiv.appendChild(inputButtonsDiv);
        parentDiv.appendChild(completeButton); // 添加完成按钮到文档
        parentDiv.appendChild(clearButton);

        // 文件上传监听事件
        inputButtonsDiv.addEventListener('change', handleFileImport);

        // 屏幕点击监听事件
        document.body.addEventListener('click', handleBodyClick);

        // 完成按钮点击事件
        completeButton.addEventListener('click', toggleRunMode);

        // 清空按钮点击事件
        clearButton.addEventListener('click', clearButtons);

        if (typeof (sendVirtualKey) == "undefined") {
            window.sendVirtualKey = function (keyState, keyName) {
                console.log(`模拟按键: ${keyName} 被 ${keyState} `);
            };
        }
    };

    const toggleEditMode = () => {
        editMode = true;
        showMessage('编辑模式已开启，点击位置生成按钮。');
        completeButton.style.display = 'block'; // 显示完成按钮
        clearButton.style.display = 'block'; // 显示完成按钮
        keyToCreate = ''; // 重置按键
        pendingClick = null; // 重置待处理点击位置


        // 创建覆盖全屏的半透明div
        overlayDiv = document.createElement('div');
        overlayDiv.style.position = 'fixed';
        overlayDiv.style.left = '0';
        overlayDiv.style.top = '0';
        overlayDiv.style.width = '100%';
        overlayDiv.style.height = '100%';
        overlayDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // 半透明黑色
        overlayDiv.style.zIndex = '998'; // 确保在按钮下方
        parentDiv.appendChild(overlayDiv);
    };

    const toggleRunMode = () => {
        editMode = false; // 关闭编辑模式
        completeButton.style.display = 'none'; // 隐藏完成按钮
        clearButton.style.display = 'none'; // 初始隐藏
        updateButtonPosition();
        showMessage('运行模式已开启，按钮将触发事件。');

        // 销毁覆盖全屏的div
        if (overlayDiv) {
            parentDiv.removeChild(overlayDiv);
            overlayDiv = null; // 清空引用
        }
    };

    const exportButtons = () => {
        const json = JSON.stringify(buttons.map(b => ({
            key: b.key,
            left: parseInt(window.getComputedStyle(b.element, null).left, 10) + parseInt(b.element.style.width, 10) / 2 + 'px',
            top: parseInt(window.getComputedStyle(b.element, null).top, 10) + parseInt(b.element.style.width, 10) / 2 + 'px',
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
                    char = 'Digit' + char;
                } else {
                    char = 'Key' + char.toUpperCase();
                }
                createButton(startX + index * 10, startY, char); // 每个按钮间隔10px
            });
            toggleEditMode();
        }
    };

    const generateArrowButtons = () => {
        const characters = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
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
            styles = window.getComputedStyle(b.element, null); // 获得计算样式，计算样式中同时包含left，right

            const x = parseInt(styles.left, 10) + parseInt(styles.width, 10) / 2;
            const y = parseInt(styles.top, 10) + parseInt(styles.height, 10) / 2;


            // 水平方向
            if (x < window.innerWidth / 2) {
            } else {
                b.element.style.right = `${parseInt(styles.right, 10)}px`;
                b.element.style.left = ''; // 清除 left
            }

            // 垂直方向
            if (y < window.innerHeight / 2) {
            } else {
                b.element.style.bottom = `${parseInt(styles.bottom, 10)}px`;
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
            reader.onload = function (e) {
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

    // 计算与中心的角度
    const calculateAngle = (dpad, clientX, clientY) => {
        const rect = dpadDiv.getBoundingClientRect(); // 获取div的位置和大小


        // 计算div的中心点
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // 计算触摸点与中心点的差值
        const deltaX = clientX - centerX;
        const deltaY = clientY - centerY;

        // 计算角度（以弧度为单位）
        const angle = Math.atan2(deltaY, deltaX); // 返回值在 -π 到 π 之间



        //const angleInDegrees = angle * (180 / Math.PI); // 转换为度
        console.log(`Current angle in radians: ${angle}`);
        //console.log(`Current angle in degrees: ${angleInDegrees}`);
        dpadDirection(angle);
    };

    const dpadDirection = (angle = "null") => {
        if (angle >= -Math.PI / 3 && angle < -Math.PI / 6) {
            //右上
            sendVirtualKey("keydown", "ArrowUp");
            sendVirtualKey("keyup", "ArrowDown");
            sendVirtualKey("keyup", "ArrowLeft");
            sendVirtualKey("keydown", "ArrowRight");
            document.querySelector(".dpad_main").className = "dpad_up_pressed dpad_right_pressed dpad_main";
        } else if (angle >= -Math.PI / 3 * 2 && angle < -Math.PI / 3) {
            //上
            sendVirtualKey("keydown", "ArrowUp");
            sendVirtualKey("keyup", "ArrowDown");
            sendVirtualKey("keyup", "ArrowLeft");
            sendVirtualKey("keyup", "ArrowRight");
            document.querySelector(".dpad_main").className = "dpad_up_pressed dpad_main";
        } else if (angle >= -Math.PI / 6 * 5 && angle < -Math.PI / 3 * 2) {
            //左上
            sendVirtualKey("keydown", "ArrowUp");
            sendVirtualKey("keyup", "ArrowDown");
            sendVirtualKey("keydown", "ArrowLeft");
            sendVirtualKey("keyup", "ArrowRight");
            document.querySelector(".dpad_main").className = "dpad_up_pressed dpad_left_pressed dpad_main";
        } else if (angle >= Math.PI / 6 * 5 || angle < -Math.PI / 6 * 5) {
            //左
            sendVirtualKey("keyup", "ArrowUp");
            sendVirtualKey("keyup", "ArrowDown");
            sendVirtualKey("keydown", "ArrowLeft");
            sendVirtualKey("keyup", "ArrowRight");
            document.querySelector(".dpad_main").className = "dpad_left_pressed dpad_main";
        } else if (angle >= Math.PI / 6 * 4 && angle < Math.PI / 6 * 5) {
            //左下
            sendVirtualKey("keyup", "ArrowUp");
            sendVirtualKey("keydown", "ArrowDown");
            sendVirtualKey("keydown", "ArrowLeft");
            sendVirtualKey("keyup", "ArrowRight");
            document.querySelector(".dpad_main").className = "dpad_down_pressed dpad_left_pressed dpad_main";
        } else if (angle >= Math.PI / 6 * 2 && angle < Math.PI / 6 * 4) {
            //下
            sendVirtualKey("keyup", "ArrowUp");
            sendVirtualKey("keydown", "ArrowDown");
            sendVirtualKey("keyup", "ArrowLeft");
            sendVirtualKey("keyup", "ArrowRight");
            document.querySelector(".dpad_main").className = "dpad_down_pressed dpad_main";
        } else if (angle >= Math.PI / 6 && angle < Math.PI / 6 * 2) {
            //右下
            sendVirtualKey("keyup", "ArrowUp");
            sendVirtualKey("keydown", "ArrowDown");
            sendVirtualKey("keyup", "ArrowLeft");
            sendVirtualKey("keydown", "ArrowRight");
            document.querySelector(".dpad_main").className = "dpad_down_pressed dpad_right_pressed dpad_main";
        } else if ((angle >= -Math.PI / 6 || angle < Math.PI / 6)) {
            //右
            sendVirtualKey("keyup", "ArrowUp");
            sendVirtualKey("keyup", "ArrowDown");
            sendVirtualKey("keyup", "ArrowLeft");
            sendVirtualKey("keydown", "ArrowRight");
            document.querySelector(".dpad_main").className = "dpad_right_pressed dpad_main";
        } else {
            //抬起
            sendVirtualKey("keyup", "ArrowUp");
            sendVirtualKey("keyup", "ArrowDown");
            sendVirtualKey("keyup", "ArrowLeft");
            sendVirtualKey("keyup", "ArrowRight");
            document.querySelector(".dpad_main").className = "dpad_main";
        }
    };

    // 处理移动事件
    const handleMove = (event) => {
        if (isMoving) {
            let clientX, clientY;
            if (event.touches) {
                // 确保只使用活动的触摸点
                const touch = Array.from(event.touches).find(t => t.identifier === activeTouchId);
                if (touch) {
                    clientX = touch.clientX; // 触摸点
                    clientY = touch.clientY;
                    calculateAngle(dpadDiv, clientX, clientY);
                }
            } else {
                clientX = event.clientX; // 鼠标位置
                clientY = event.clientY;
                calculateAngle(dpadDiv, clientX, clientY);
            }
        }
    };


    const createTemporaryButton = (x, y) => {
        const tempButton = document.createElement('div');
        tempButton.className = 'virtualButton';
        tempButton.style.left = `${x - 25}px`; // 位置调整
        tempButton.style.top = `${y - 25}px`; // 位置调整
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
            } catch { }
            keyToCreate = null; // 重置
            pendingClick = null; // 重置
        });

        tempButton.addEventListener('blur', () => {
            try {
                parentDiv.removeChild(tempButton); // 移除临时按钮       
            } catch { }
        });
    };

    const createButton = (x, y, key, size = 50) => {
        const button = document.createElement('div');

        // 将按钮位置设置为点击位置的中心
        button.style.left = `${x - size / 2}px`; // 根据大小调整位置
        button.style.top = `${y - size / 2}px`; // 根据大小调整位置
        button.style.width = `${size}px`; // 设置按钮宽度
        button.style.height = `${size}px`; // 设置按钮高度
        button.textContent = key;


        if (key == "dpad") {
            dpadDiv = button;
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
            `;
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
            // 鼠标事件
            button.addEventListener('mousedown', (event) => {
                event.stopPropagation(); // 阻止事件冒泡
                if (!editMode) {
                    isMoving = true; // 开始移动
                    calculateAngle(dpadDiv, event.clientX, event.clientY);
                    document.addEventListener('mousemove', handleMove); // 监听移动
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
                    isMoving = true; // 开始移动
                    const touch = event.touches[0]; // 获取第一个触摸点
                    activeTouchId = touch.identifier; // 记录活动的触摸点
                    calculateAngle(dpadDiv, touch.clientX, touch.clientY);
                    document.addEventListener('touchmove', handleMove); // 监听移动
                }
            });

            // 监听触摸结束事件
            button.addEventListener('touchend', () => {
                if (editMode) {
                    clearTimeout(longPressTimer);
                } else {
                    isMoving = false; // 停止移动
                    activeTouchId = null; // 重置活动触摸点
                    document.removeEventListener('touchmove', handleMove); // 移除移动监听


                    //抬起所有方向键
                    dpadDirection();
                }
            });

            // 监听鼠标释放事件
            document.addEventListener('mouseup', () => {
                if (editMode) {
                    clearTimeout(longPressTimer);
                } else {
                    isMoving = false; // 停止移动
                    document.removeEventListener('mousemove', handleMove); // 移除移动监听


                    //抬起所有方向键
                    dpadDirection();
                }
            });
        } else {
            button.addEventListener('click', (event) => {
                event.stopPropagation(); // 阻止事件冒泡
                if (!editMode) {
                    // 模拟按键事件
                    console.log(`模拟按键: ${key}`);
                    sendVirtualKey("keydown", key);
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
                    sendVirtualKey("keydown", key);
                }
            });

            button.addEventListener('touchend', () => {
                if (editMode) {
                    clearTimeout(longPressTimer);
                } else {
                    sendVirtualKey("keyup", key);
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
    };


    const clearButtons = () => {
        // 清空现有按钮
        buttons.forEach(b => parentDiv.removeChild(b.element));
        buttons = [];
    };


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
        loadButtons,
        exportButtons,
        importButtons,
        clearButtons
    };
})();
