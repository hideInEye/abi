import { useMemo, useState } from "react";
import type { Key } from "react";
import { Select, Spin } from "antd";
import type { SelectProps } from "antd";
import { debounce } from "lodash";
import { queryUser } from "@/service/api/space";

export interface DebounceSelectProps<ValueType = any>
  extends Omit<SelectProps<ValueType | ValueType[]>, "options" | "children"> {
  debounceTimeout?: number;
  onChange?: (value: ValueType | ValueType[]) => void;
  disabledValues?: Key[];
}

function searchUser({
  onChange,
  disabledValues = [],
}: DebounceSelectProps<any>) {
  const [fetching, setFetching] = useState(false);
  const [options, setOptions] = useState<any>([]);
  const disabledSet = useMemo(() => {
    return new Set(
      (disabledValues || []).map((value) => {
        return String(value);
      }),
    );
  }, [disabledValues]);

  const debounceFetcher = debounce((value: string) => {
    setOptions([]);
    setFetching(true);

    queryUser(value).then((res) => {
      if (res.data) {
        const newOptions = res.data.map((item: any) => ({
          value: item.userUuid,
          label: item.userName,
        }));
        setOptions(newOptions);
      }

      setFetching(false);
    });
  }, 300);

  return (
    <Select
      labelInValue
      value={null}
      showSearch={true}
      suffixIcon={null}
      filterOption={false}
      placeholder="搜索用户"
      style={{ width: "100%" }}
      onChange={onChange}
      onSearch={(value) => debounceFetcher(value)}
      notFoundContent={fetching ? <Spin size="small" /> : "没有找到用户"}
      options={options.map((option: any) => ({
        ...option,
        disabled: disabledSet.has(String(option.value)),
      }))}
      onSelect={() => {
        setOptions([]);
      }}
      optionRender={(option) => (
        <div style={{ display: "flex", alignItems: "center" }}>
          {option.label}
        </div>
      )}
    />
  );
}

export default searchUser;
