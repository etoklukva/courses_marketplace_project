import { useEffect, useState } from "react";
import { getBlockchain, formatToken, parseToken } from "./utils/blockchain";
import { COURSE_MARKETPLACE_ADDRESS } from "./config/contracts";
import "./index.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { ethers } from "ethers";

function App() {
  const [userAddress, setUserAddress] = useState("");
  const [tokenContract, setTokenContract] = useState(null);
  const [marketplaceContract, setMarketplaceContract] = useState(null);
  const [ownerAddress, setOwnerAddress] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [balance, setBalance] = useState("0");
  const [status, setStatus] = useState("Не подключено");

  const [courses, setCourses] = useState([]);

  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseDescription, setNewCourseDescription] = useState("");
  const [newCoursePrice, setNewCoursePrice] = useState("");

  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");

  const [mintTo, setMintTo] = useState("");
  const [mintAmount, setMintAmount] = useState("");

  const [updateCourseId, setUpdateCourseId] = useState("");
  const [updatePrice, setUpdatePrice] = useState("");

  const [toggleCourseId, setToggleCourseId] = useState("");
  const [toggleActive, setToggleActive] = useState("true");

  const [blockCourseId, setBlockCourseId] = useState("");
  const [blockTitle, setBlockTitle] = useState("");
  const [blockContent, setBlockContent] = useState("");

  const [courseBlocks, setCourseBlocks] = useState({});
  const [selectedBlocks, setSelectedBlocks] = useState({});

  const [deleteCourseId, setDeleteCourseId] = useState("");
  const [deleteBlockCourseId, setDeleteBlockCourseId] = useState("");
  const [deleteBlockId, setDeleteBlockId] = useState("");

  async function connectWallet() {
    try {
      setStatus("Подключение MetaMask...");
      const blockchain = await getBlockchain();

      setUserAddress(blockchain.userAddress);
      setTokenContract(blockchain.tokenContract);
      setMarketplaceContract(blockchain.marketplaceContract);

      const owner = await blockchain.marketplaceContract.owner();
      setOwnerAddress(owner);
      setIsOwner(owner.toLowerCase() === blockchain.userAddress.toLowerCase());

      const rawBalance = await blockchain.tokenContract.balanceOf(blockchain.userAddress);
      setBalance(formatToken(rawBalance));

      await loadCourses(blockchain.marketplaceContract, blockchain.userAddress);
      await loadCourseBlocks(blockchain.marketplaceContract, blockchain.userAddress);

      setStatus("Кошелёк подключён");
    } catch (error) {
      setStatus(error.reason || error.message);
    }
  }

  async function loadCourses(contract = marketplaceContract, address = userAddress) {
    try {
      if (!contract || !address) return;

      const total = await contract.nextCourseId();
      const list = [];

      for (let i = 0; i < Number(total); i++) {
        const course = await contract.courses(i);
        const access = await contract.checkAccess(address, i);

        if (!course.exists || course.deleted) {
          continue;
        }

        list.push({
          id: Number(course.id),
          title: course.title,
          description: course.description,
          priceRaw: course.price,
          price: formatToken(course.price),
          active: course.active,
          access
        });
      }

      setCourses(list);
    } catch (error) {
      setStatus(error.reason || error.message);
    }
  }

  async function refreshData() {
    try {
      if (!tokenContract || !marketplaceContract || !userAddress) return;

      const rawBalance = await tokenContract.balanceOf(userAddress);
      setBalance(formatToken(rawBalance));

      const owner = await marketplaceContract.owner();
      setOwnerAddress(owner);
      setIsOwner(owner.toLowerCase() === userAddress.toLowerCase());

      await loadCourses(marketplaceContract, userAddress);
      await loadCourseBlocks(marketplaceContract, userAddress);

      setStatus("Данные обновлены");
    } catch (error) {
      setStatus(error.reason || error.message);
    }
  }

  async function createCourse() {
    try {
      if (!marketplaceContract) return;
      setStatus("Создание курса...");

      const tx = await marketplaceContract.createCourse(
        newCourseTitle,
        newCourseDescription,
        parseToken(newCoursePrice)
      );
      await tx.wait();

      setNewCourseTitle("");
      setNewCourseDescription("");
      setNewCoursePrice("");

      await refreshData();
      setStatus("Курс создан");
    } catch (error) {
      setStatus(error.reason || error.message);
    }
  }

  async function transferTokens() {
    try {
      if (!tokenContract) return;
      setStatus("Перевод токенов...");

      const tx = await tokenContract.transfer(
        transferTo,
        parseToken(transferAmount)
      );
      await tx.wait();

      setTransferTo("");
      setTransferAmount("");

      await refreshData();
      setStatus("Токены переведены");
    } catch (error) {
      setStatus(error.reason || error.message);
    }
  }

  async function mintTokens() {
    try {
      if (!tokenContract) return;
      setStatus("Выпуск токенов...");

      const tx = await tokenContract.mint(
        mintTo,
        parseToken(mintAmount)
      );
      await tx.wait();

      setMintTo("");
      setMintAmount("");

      await refreshData();
      setStatus("Токены выпущены");
    } catch (error) {
      setStatus(error.reason || error.message);
    }
  }

  async function updatePriceHandler() {
    try {
      if (!marketplaceContract) return;
      setStatus("Обновление цены...");

      const tx = await marketplaceContract.updateCoursePrice(
        Number(updateCourseId),
        parseToken(updatePrice)
      );
      await tx.wait();

      setUpdateCourseId("");
      setUpdatePrice("");

      await refreshData();
      setStatus("Цена обновлена");
    } catch (error) {
      setStatus(error.reason || error.message);
    }
  }

  async function updateStatusHandler() {
    try {
      if (!marketplaceContract) return;
      setStatus("Изменение статуса курса...");

      const tx = await marketplaceContract.setCourseActive(
        Number(toggleCourseId),
        toggleActive === "true"
      );
      await tx.wait();

      setToggleCourseId("");
      setToggleActive("true");

      await refreshData();
      setStatus("Статус курса обновлён");
    } catch (error) {
      setStatus(error.reason || error.message);
    }
  }

  async function approveCourse(course) {
    try {
      if (!tokenContract) return;
      setStatus(`Подтверждение списания средств для курса ${course.id}...`);

      const tx = await tokenContract.approve(
        COURSE_MARKETPLACE_ADDRESS,
        course.priceRaw
      );
      await tx.wait();

      await refreshData();
      setStatus(`Списание средств для курса ${course.id} разрешено`);
    } catch (error) {
      setStatus(error.reason || error.message);
    }
  }

  async function buyCourse(courseId) {
    try {
      if (!marketplaceContract) return;
      setStatus(`Покупка курса ${courseId}...`);

      const tx = await marketplaceContract.buyCourse(courseId);
      await tx.wait();

      await refreshData();
      setStatus(`Курс ${courseId} куплен`);
    } catch (error) {
      setStatus(error.reason || error.message);
    }
  }

  async function addCourseBlock() {
    try {
      if (!marketplaceContract) return;
      setStatus("Сохранение блока курса...");

      const currentBlockCount = await marketplaceContract.courseBlockCount(Number(blockCourseId));
      const blockId = Number(currentBlockCount);

      const response = await fetch("http://localhost:4000/api/course-blocks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          courseId: Number(blockCourseId),
          blockId,
          title: blockTitle,
          content: blockContent
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Backend error");
      }

      const tx = await marketplaceContract.addCourseBlock(
        Number(blockCourseId),
        blockTitle,
        data.contentHash
      );
      await tx.wait();

      setBlockCourseId("");
      setBlockTitle("");
      setBlockContent("");

      await refreshData();
      setStatus("Блок курса добавлен");
    } catch (error) {
      setStatus(error.reason || error.message);
    }
  }

  async function loadCourseBlocks(contract = marketplaceContract, address = userAddress) {
    try {
      if (!contract || !address) return;

      const totalCourses = await contract.nextCourseId();
      const blocksMap = {};

      for (let i = 0; i < Number(totalCourses); i++) {
        const access = await contract.checkAccess(address, i);
        const blockCount = await contract.courseBlockCount(i);

        blocksMap[i] = [];

        if (access || isOwner) {
          for (let j = 0; j < Number(blockCount); j++) {
             const blockData = await contract.getCourseBlock(i, j);
            if (blockData[3]) {
              continue;
            }
            blocksMap[i].push({
              id: Number(blockData[0]),
              title: blockData[1],
              contentHash: blockData[2]
            });
          }
        }
      }

      setCourseBlocks(blocksMap);
    } catch (error) {
      setStatus(error.reason || error.message);
    }
  }

  async function deleteCourseHandler() {
    try {
      if (!marketplaceContract) return;
      setStatus("Удаление курса...");

      const tx = await marketplaceContract.deleteCourse(Number(deleteCourseId));
      await tx.wait();

      setDeleteCourseId("");
      await refreshData();
      setStatus("Курс удалён");
    } catch (error) {
      setStatus(error.reason || error.message);
    }
  }

  async function deleteCourseBlockHandler() {
    try {
      if (!marketplaceContract) return;
      setStatus("Удаление блока курса...");

      const tx = await marketplaceContract.deleteCourseBlock(
        Number(deleteBlockCourseId),
        Number(deleteBlockId)
      );
      await tx.wait();

      setDeleteBlockCourseId("");
      setDeleteBlockId("");

      await refreshData();
      setStatus("Блок курса удалён");
    } catch (error) {
      setStatus(error.reason || error.message);
    }
  }

  async function openBlock(course, block) {
    try {
      if (!course.active) {
        setStatus("Курс неактивен. Доступ к главам временно закрыт.");
        return;
      }

      setStatus("Загрузка главы...");

      const response = await fetch(
        `http://localhost:4000/api/course-blocks/${course.id}/${block.id}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка загрузки блока");
      }

      const calculatedHash = ethers.keccak256(
        ethers.toUtf8Bytes(data.content)
      );

      if (calculatedHash.toLowerCase() !== block.contentHash.toLowerCase()) {
        throw new Error("Нарушена целостность данных");
      }

      setSelectedBlocks((prev) => ({
        ...prev,
        [course.id]: {
          id: block.id,
          title: block.title,
          content: data.content
        }
      }));

      setStatus("Глава загружена");
    } catch (error) {
      setStatus(error.message);
    }
  }

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", () => {
        window.location.reload();
      });

      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }
  }, []);

  return (
    <div className="page">
      <div className="container">
        <h1>Маркетплейс Курсов</h1>

        <div className="card">
          <button onClick={connectWallet}>Подключить MetaMask</button>
          <button onClick={refreshData}>Обновить данные</button>

          <p><strong>Статус:</strong> {status}</p>
          <p><strong>Адрес:</strong> {userAddress || "Не подключен"}</p>
          <p><strong>Владелец:</strong> {ownerAddress || "-"}</p>
          <p><strong>Роль:</strong> {isOwner ? "Владелец" : "Студент"}</p>
          <p><strong>Баланс:</strong> {balance} STK</p>
        </div>

        {isOwner && (
          <>
            <div className="card">
              <h2>Создать Курс</h2>
              <input
                type="text"
                placeholder="Название курса"
                value={newCourseTitle}
                onChange={(e) => setNewCourseTitle(e.target.value)}
              />
              <textarea
                placeholder="Описание курса"
                value={newCourseDescription}
                onChange={(e) => setNewCourseDescription(e.target.value)}
              />
              <input
                type="text"
                placeholder="Цена в STK"
                value={newCoursePrice}
                onChange={(e) => setNewCoursePrice(e.target.value)}
              />
              <button onClick={createCourse}>Создать</button>
            </div>

            <div className="card">
              <h2>Перевести токены студенту</h2>
              <input
                type="text"
                placeholder="Адрес студента"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
              />
              <input
                type="text"
                placeholder="Количество STK"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
              />
              <button onClick={transferTokens}>Перевести</button>
            </div>

            <div className="card">
              <h2>Выпустить токены</h2>
              <input
                type="text"
                placeholder="Адрес получателя"
                value={mintTo}
                onChange={(e) => setMintTo(e.target.value)}
              />
              <input
                type="text"
                placeholder="Количество STK"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
              />
              <button onClick={mintTokens}>Выпустить</button>
            </div>

            <div className="card">
              <h2>Обновить цену Курса</h2>
              <input
                type="number"
                placeholder="ID Курса"
                value={updateCourseId}
                onChange={(e) => setUpdateCourseId(e.target.value)}
              />
              <input
                type="text"
                placeholder="Новая цена в STK"
                value={updatePrice}
                onChange={(e) => setUpdatePrice(e.target.value)}
              />
              <button onClick={updatePriceHandler}>Обновить</button>
            </div>

            <div className="card">
              <h2>Изменить статус Курса</h2>
              <input
                type="number"
                placeholder="ID Курса"
                value={toggleCourseId}
                onChange={(e) => setToggleCourseId(e.target.value)}
              />
              <select
                value={toggleActive}
                onChange={(e) => setToggleActive(e.target.value)}
              >
                <option value="true">Активен</option>
                <option value="false">Неактивен</option>
              </select>
              <button onClick={updateStatusHandler}>Обновить статус</button>
            </div>

            <div className="card">
              <h2>Удалить Курс</h2>
              <input
                type="number"
                placeholder="ID Курса"
                value={deleteCourseId}
                onChange={(e) => setDeleteCourseId(e.target.value)}
              />
              <button onClick={deleteCourseHandler}>Удалить</button>
            </div>

            <div className="card">
              <h2>Добавить блок курса</h2>
              <input
                type="number"
                placeholder="ID Курса"
                value={blockCourseId}
                onChange={(e) => setBlockCourseId(e.target.value)}
              />
              <input
                type="text"
                placeholder="Тема блока"
                value={blockTitle}
                onChange={(e) => setBlockTitle(e.target.value)}
              />
              <textarea
                placeholder="Содержимое блока. Можно вставлять обычный текст, Markdown, LaTeX-формулы как текст, ссылки на изображения."
                value={blockContent}
                onChange={(e) => setBlockContent(e.target.value)}
                style={{ minHeight: "220px" }}
              />
              <button onClick={addCourseBlock}>Добавить блок курса</button>
            </div>

            <div className="card">
              <h2>Удалить блок Курса</h2>
              <input
                type="number"
                placeholder="ID Курса"
                value={deleteBlockCourseId}
                onChange={(e) => setDeleteBlockCourseId(e.target.value)}
              />
              <input
                type="number"
                placeholder="ID Блока"
                value={deleteBlockId}
                onChange={(e) => setDeleteBlockId(e.target.value)}
              />
              <button onClick={deleteCourseBlockHandler}>Удалить</button>
            </div>
          </>
        )}

        <div className="card">
          <h2>Курсы</h2>

          {courses.length === 0 && <p>Здесь пока что пусто</p>}

          {courses.map((course) => (
            <div key={course.id} className="course">
              <p><strong>ID:</strong> {course.id}</p>
              <p><strong>Название:</strong> {course.title}</p>
              <p><strong>Описание:</strong> {course.description}</p>
              <p><strong>Цена:</strong> {course.price} STK</p>
              <p><strong>Активен:</strong> {course.active ? "Да" : "Нет"}</p>
              <p><strong>Доступ:</strong> {course.access ? "Есть" : "Нет"}</p>

              {!isOwner && (
                <div className="actions">
                  {!course.access && (
                    <>
                      <button onClick={() => approveCourse(course)}>Разрешить списание</button>
                      <button onClick={() => buyCourse(course.id)}>Купить</button>
                    </>
                  )}
                </div>
              )}

              {course.access && courseBlocks[course.id] && courseBlocks[course.id].length > 0 && (
                <div style={{ marginTop: "16px" }}>
                  <p><strong>Блоки курса:</strong></p>
                  <div className="actions" style={{ flexWrap: "wrap" }}>
                    {courseBlocks[course.id].map((block) => (
                      <button
                        key={block.id}
                        onClick={() => openBlock(course, block)}
                        disabled={!course.active}
                        style={{
                          opacity: course.active ? 1 : 0.5,
                          cursor: course.active ? "pointer" : "not-allowed"
                        }}
                      >
                        {block.title}
                      </button>
                    ))}
                  </div>
                  {selectedBlocks[course.id] && course.active && (
                    <div
                      style={{
                        marginTop: "16px",
                        padding: "16px",
                        border: "1px solid #dbe1ea",
                        borderRadius: "12px",
                        background: "#f9fbff",
                        whiteSpace: "pre-wrap"
                      }}
                    >
                      <h3>{selectedBlocks[course.id].title}</h3>
                      <div className="markdown-content">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                        >
                          {selectedBlocks[course.id].content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;