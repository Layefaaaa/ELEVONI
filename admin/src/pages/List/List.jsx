import React, { useState, useEffect } from "react";
import api from "../../api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import Pagination from "../../components/Pagination/Pagination";
import "./List.css";

const PAGE_SIZE = 20;

const List = ({ url }) => {
  const [list, setList] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const fetchList = async (targetPage = 1) => {
    try {
      const response = await api.get(url + "/api/fish/admin-list", {
        params: { page: targetPage, limit: PAGE_SIZE },
      });
      if (response.data.success) {
        setList(response.data.data);
        setPagination(response.data.pagination || null);
        setPage(targetPage);
      } else toast.error("Error loading products");
    } catch {
      toast.error("Error loading products");
    }
  };

  const removeFish = async (fishId) => {
    try {
      const response = await api.post(url + "/api/fish/remove", { id: fishId });
      if (response.data.success) {
        toast.success(response.data.message);
        fetchList(page);
      } else toast.error("Error deleting item");
    } catch {
      toast.error("Error deleting item");
    }
  };

  useEffect(() => { fetchList(1); }, []);

  return (
    <div className="list add flex-col">
      <p>All Products List</p>
      <div className="list-table">
        <div className="list-table-format title">
          <b>Image</b><b>Name</b><b>Category</b><b>Price</b><b>Status</b><b>Actions</b>
        </div>
        {list.map((item) => (
          <div key={item._id} className="list-table-format">
            <img src={item.image && item.image.startsWith("http") ? item.image : url + "/images/" + item.image} alt={item.name} />
            <p>{item.name}</p>
            <p>{item.category}</p>
            <p>NGN{Number(item.price).toLocaleString()}</p>
            <p>{item.visible === false ? "Hidden" : "Live"}</p>
            <div className="actions">
              <button className="media-btn" onClick={() => navigate("/edit/" + item._id)}>Edit</button>
              <button className="media-btn" onClick={() => navigate("/add-media/" + item._id)}>Add Media</button>
              <button className="delete-btn" onClick={() => removeFish(item._id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      <Pagination pagination={pagination} onPageChange={(nextPage) => fetchList(nextPage)} />
    </div>
  );
};

export default List;
